const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const s3 = require('../lib/AmazonS3');
const {
  processVideo,
  processAudio,
  makeWorkDir,
  removeWorkDir,
  randomName,
} = require('../lib/MediaProcessing');
const { createWatermarkSvg, createImageThumbnail, generateImageDerivatives, generateShowcaseThumbnail } = require('./AssetPreviewServices');
const {
  claimMediaAssetJobRepository,
  failMediaAssetJobRepository,
  completeMediaAssetJobRepository,
} = require('../repositories/MediaJobRepositories');

const DEFAULT_TAG_PATH = path.join(__dirname, '..', 'assets', 'ensemble-tag.mp3');

function safeBaseName(filename) {
  return String(filename || 'asset').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 70) || 'asset';
}

function assertOriginalKey(key) {
  const value = String(key || '').trim();
  if (!value.startsWith('asset-originals/') || value.includes('..') || value.includes('\\') || value.startsWith('/')) {
    throw new Error('Unsupported protected original path');
  }
  return value;
}

async function downloadOriginal(key, destination) {
  const source = await s3.send(new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: assertOriginalKey(key),
  }));
  if (!source.Body) throw new Error('The protected original returned no content');
  await pipeline(source.Body, fs.createWriteStream(destination));
}

async function uploadFile(localPath, key, contentType, { publicCache }) {
  const { size } = await fs.promises.stat(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: fs.createReadStream(localPath),
    ContentLength: size,
    ContentType: contentType,
    ...(publicCache ? { CacheControl: 'public, max-age=31536000, immutable' } : {}),
  }));
  return size;
}

async function deleteKeys(keys) {
  await Promise.all(keys.filter(Boolean).map((key) => s3.send(new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  })).catch(() => undefined)));
}

async function runMediaJob(job) {
  const workDir = await makeWorkDir();
  const uploaded = [];
  try {
    const inputPath = path.join(workDir, 'input');
    if (job.kind !== 'image') await downloadOriginal(job.original_path, inputPath);
    const base = safeBaseName(job.original_name);
    let outputs;

    if (job.kind === 'image') {
      const generate = job.is_content === false ? generateShowcaseThumbnail : generateImageDerivatives;
      outputs = await generate({
        file_id: job.original_file_id, name: job.original_name,
        path: job.original_path, size_bytes: job.original_size_bytes,
      });
      uploaded.push(outputs.thumbnail.path, outputs.proxy?.path);
    } else if (job.kind === 'video') {
      const result = await processVideo({ inputPath, workDir, createWatermarkSvg, createImageThumbnail });
      const proxyKey = `assets/proxies/${randomName()}.mp4`;
      const proxySize = await uploadFile(result.proxyPath, proxyKey, 'video/mp4', { publicCache: true });
      uploaded.push(proxyKey);
      const thumbnailKey = `assets/thumbnails/320/${randomName()}.webp`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: thumbnailKey,
        Body: result.thumbnail,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      uploaded.push(thumbnailKey);
      outputs = {
        width: result.width,
        height: result.height,
        durationSeconds: result.durationSeconds,
        proxy: { name: `${base}-proxy-ensemble.mp4`, path: proxyKey, mimeType: 'video/mp4', sizeBytes: proxySize },
        thumbnail: { name: `${base}-thumbnail-320px.webp`, path: thumbnailKey, mimeType: 'image/webp', sizeBytes: result.thumbnail.length },
      };
      if (result.cappedOriginalPath) {
        // stays under the protected prefix: it is still the downloadable original
        const cappedKey = `asset-originals/${randomName()}-1080p.mp4`;
        const cappedSize = await uploadFile(result.cappedOriginalPath, cappedKey, 'video/mp4', { publicCache: false });
        uploaded.push(cappedKey);
        outputs.cappedOriginal = { name: `${base}-1080p.mp4`, path: cappedKey, mimeType: 'video/mp4', sizeBytes: cappedSize };
      }
    } else {
      const result = await processAudio({
        inputPath,
        workDir,
        tagPath: process.env.ENSEMBLE_AUDIO_TAG_PATH || DEFAULT_TAG_PATH,
      });
      const proxyKey = `assets/proxies/${randomName()}.mp3`;
      const proxySize = await uploadFile(result.proxyPath, proxyKey, 'audio/mpeg', { publicCache: true });
      uploaded.push(proxyKey);
      const thumbnailKey = `assets/thumbnails/audio-30s/${randomName()}.mp3`;
      const thumbnailSize = await uploadFile(result.thumbnailPath, thumbnailKey, 'audio/mpeg', { publicCache: true });
      uploaded.push(thumbnailKey);
      outputs = {
        durationSeconds: result.durationSeconds,
        proxy: { name: `${base}-ensemble-tag.mp3`, path: proxyKey, mimeType: 'audio/mpeg', sizeBytes: proxySize },
        thumbnail: { name: `${base}-preview-30s.mp3`, path: thumbnailKey, mimeType: 'audio/mpeg', sizeBytes: thumbnailSize },
      };
    }

    const completed = await completeMediaAssetJobRepository(job, outputs);
    if (!completed) {
      await deleteKeys(uploaded);
      return 'skipped';
    }
    // the uncapped original is superseded by the capped one
    await deleteKeys([completed.replacedOriginalPath]);
    return 'done';
  } catch (error) {
    await deleteKeys(uploaded);
    const willRetry = await failMediaAssetJobRepository(job, error.message);
    console.error(`Media job ${job.media_asset_job_id} failed${willRetry ? ' (will retry)' : ''}:`, error.message);
    return willRetry ? 'retry' : 'failed';
  } finally {
    await removeWorkDir(workDir);
  }
}

// Processes at most one job; returns null when the queue is empty.
async function processNextMediaJob() {
  const job = await claimMediaAssetJobRepository();
  return job ? runMediaJob(job) : null;
}

async function runMediaWorker({ concurrency = 1, idleMs = 3000 } = {}) {
  if (!process.env.AWS_BUCKET_NAME) throw new Error('AWS_BUCKET_NAME is required');
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const lane = async () => {
    while (!stopping) {
      let outcome = null;
      try {
        outcome = await processNextMediaJob();
      } catch (error) {
        console.error('Media worker error:', error.message);
      }
      if (outcome === null) await sleep(idleMs);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, lane));
}

module.exports = { runMediaJob, processNextMediaJob, runMediaWorker };
