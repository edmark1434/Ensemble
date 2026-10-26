const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../lib/AmazonS3');
const { createImageThumbnail } = require('./AssetPreviewServices');
const { createVideoThumbnail, createAudioThumbnail, makeWorkDir, removeWorkDir, randomName } = require('../lib/MediaProcessing');
const { listMediaThumbnailCandidatesRepository, replaceMediaThumbnailRepository } = require('../repositories/MediaThumbnailRepositories');

async function backfillMediaThumbnailsServices({ limit = 1000, dryRun = false } = {}) {
  const safeLimit = Math.min(5000, Math.max(1, Number.parseInt(limit, 10) || 1000));
  const candidates = await listMediaThumbnailCandidatesRepository(safeLimit);
  const result = { candidates: candidates.length, updated: 0, skipped: 0, failed: [] };
  if (dryRun) return result;
  if (!process.env.AWS_BUCKET_NAME) throw new Error('AWS_BUCKET_NAME is required');
  for (const candidate of candidates) {
    const workDir = await makeWorkDir();
    let uploadedKey;
    try {
      const key = candidate.original_path;
      if (!(key.startsWith('asset-originals/') || key.startsWith('assets/')) || key.includes('..') || key.includes('\\')) {
        throw new Error('Unsupported original path');
      }
      const inputPath = path.join(workDir, 'input');
      const source = await s3.send(new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }),
        { abortSignal: AbortSignal.timeout(120_000) });
      if (!source.Body) throw new Error('The original returned no content');
      await pipeline(source.Body, fs.createWriteStream(inputPath));
      const isAudio = candidate.type === 'audio';
      let bytes;
      if (isAudio) {
        bytes = await fs.promises.readFile(await createAudioThumbnail({ inputPath, workDir }));
      } else if (candidate.type === 'video') {
        bytes = await createVideoThumbnail({ inputPath, workDir, createImageThumbnail });
      } else {
        bytes = await createImageThumbnail(await fs.promises.readFile(inputPath));
      }
      const suffix = isAudio ? 'preview-30s.mp3' : 'thumbnail-320px.webp';
      const thumbnail = {
        name: `${candidate.original_name.replace(/\.[^.]+$/, '')}-${suffix}`,
        path: `assets/thumbnails/${isAudio ? 'audio-30s' : '320'}/${randomName()}.${isAudio ? 'mp3' : 'webp'}`,
        mimeType: isAudio ? 'audio/mpeg' : 'image/webp', sizeBytes: bytes.length,
      };
      await s3.send(new PutObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: thumbnail.path,
        Body: bytes, ContentType: thumbnail.mimeType, CacheControl: 'public, max-age=31536000, immutable' }),
      { abortSignal: AbortSignal.timeout(120_000) });
      uploadedKey = thumbnail.path;
      if (await replaceMediaThumbnailRepository(candidate, thumbnail)) {
        result.updated += 1;
        uploadedKey = null;
      } else result.skipped += 1;
    } catch (error) {
      result.failed.push({ mediaAssetId: candidate.media_asset_id, error: error.message });
    } finally {
      if (uploadedKey) await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: uploadedKey }),
        { abortSignal: AbortSignal.timeout(15_000) }).catch(() => undefined);
      await removeWorkDir(workDir);
    }
  }
  return result;
}

module.exports = { backfillMediaThumbnailsServices };
