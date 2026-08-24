const crypto = require('crypto');
const sharp = require('sharp');
const {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const s3 = require('../lib/AmazonS3');
const {
  listAssetPreviewBackfillCandidatesRepository,
  replaceAssetBundlePreviewRepository,
} = require('../repositories/AssetPreviewRepositories');

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_PREVIEW_DIMENSION = 640;
const MAX_PREVIEW_SCALE = 0.55;
const PREVIEW_QUALITY = 36;

function safeBaseName(filename) {
  return String(filename || 'asset')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 70) || 'asset';
}

function assertSafeObjectKey(key) {
  const value = String(key || '').trim();
  if ((!value.startsWith('asset-originals/') && !value.startsWith('assets/'))
    || value.includes('..') || value.includes('\\') || value.startsWith('/')) {
    throw new Error('Unsupported protected original path');
  }
  return value;
}

async function objectBodyToBuffer(body) {
  if (!body) throw new Error('The protected original returned no content');
  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function createWatermarkSvg(width, height) {
  const fontSize = Math.max(12, Math.min(30, Math.round(Math.min(width, height) * 0.07)));
  const footerHeight = Math.max(28, Math.round(fontSize * 1.8));
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${height - footerHeight}" width="${width}" height="${footerHeight}" fill="rgba(0,0,0,0.55)" />
      <text x="${width - 10}" y="${height - Math.max(8, Math.round(fontSize * 0.35))}"
        text-anchor="end" font-family="Arial, sans-serif" font-size="${fontSize}"
        font-weight="700" fill="rgba(255,255,255,0.92)">Ensemble Preview</text>
      <text x="${Math.round(width / 2)}" y="${Math.round(height / 2)}"
        text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif"
        font-size="${Math.max(14, Math.round(fontSize * 1.3))}" font-weight="700"
        fill="rgba(255,255,255,0.28)"
        transform="rotate(-22 ${Math.round(width / 2)} ${Math.round(height / 2)})">Ensemble Preview</text>
    </svg>
  `);
}

async function createLowQualityImagePreview(sourceBuffer) {
  if (!Buffer.isBuffer(sourceBuffer) || sourceBuffer.length < 1 || sourceBuffer.length > MAX_SOURCE_BYTES) {
    throw new Error('Protected original size is invalid');
  }
  const inputOptions = { limitInputPixels: 50_000_000, failOn: 'error' };
  const metadata = await sharp(sourceBuffer, inputOptions).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Protected original has invalid dimensions');
  const swapsAxes = Number(metadata.orientation) >= 5 && Number(metadata.orientation) <= 8;
  const sourceWidth = swapsAxes ? metadata.height : metadata.width;
  const sourceHeight = swapsAxes ? metadata.width : metadata.height;
  const targetWidth = Math.max(1, Math.min(
    MAX_PREVIEW_DIMENSION,
    Math.round(sourceWidth * MAX_PREVIEW_SCALE)
  ));
  const targetHeight = Math.max(1, Math.min(
    MAX_PREVIEW_DIMENSION,
    Math.round(sourceHeight * MAX_PREVIEW_SCALE)
  ));
  const { data: resized, info } = await sharp(sourceBuffer, inputOptions)
    .rotate()
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: PREVIEW_QUALITY, effort: 4, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });
  return sharp(resized)
    .composite([{ input: createWatermarkSvg(info.width, info.height) }])
    .webp({ quality: PREVIEW_QUALITY, effort: 4, smartSubsample: true })
    .toBuffer();
}

async function backfillCandidate(candidate) {
  const originalKey = assertSafeObjectKey(candidate.original_path);
  const declaredSize = Number(candidate.original_size_bytes);
  if (!Number.isSafeInteger(declaredSize) || declaredSize < 1 || declaredSize > MAX_SOURCE_BYTES) {
    throw new Error('Protected original exceeds the image preview limit');
  }
  const source = await s3.send(new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: originalKey,
  }));
  const previewBytes = await createLowQualityImagePreview(await objectBodyToBuffer(source.Body));
  const previewName = `${safeBaseName(candidate.original_name)}-low-quality-preview.webp`;
  const previewKey = `assets/previews/${candidate.media_asset_bundle_file_id}/${crypto.randomUUID()}.webp`;
  let uploaded = false;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: previewKey,
      Body: previewBytes,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    uploaded = true;
    const replaced = await replaceAssetBundlePreviewRepository({
      bundleFileId: candidate.media_asset_bundle_file_id,
      expectedPreviewFileId: candidate.preview_file_id,
      previewName,
      previewPath: previewKey,
      previewSizeBytes: previewBytes.length,
    });
    if (!replaced) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: previewKey,
      })).catch(() => undefined);
      return false;
    }
    return true;
  } catch (error) {
    if (uploaded) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: previewKey,
      })).catch(() => undefined);
    }
    throw error;
  }
}

async function backfillAssetBundlePreviewsServices({ limit = 1000, dryRun = false } = {}) {
  if (!process.env.AWS_BUCKET_NAME) throw new Error('AWS_BUCKET_NAME is required');
  const safeLimit = Math.min(5000, Math.max(1, Number.parseInt(limit, 10) || 1000));
  const candidates = await listAssetPreviewBackfillCandidatesRepository(safeLimit);
  if (dryRun) return { candidates: candidates.length, updated: 0, skipped: 0, failed: [] };
  const result = { candidates: candidates.length, updated: 0, skipped: 0, failed: [] };
  for (const candidate of candidates) {
    try {
      if (await backfillCandidate(candidate)) result.updated += 1;
      else result.skipped += 1;
    } catch (error) {
      result.failed.push({
        bundleFileId: candidate.media_asset_bundle_file_id,
        error: error instanceof Error ? error.message : 'Unknown preview error',
      });
    }
  }
  return result;
}

module.exports = {
  createLowQualityImagePreview,
  backfillAssetBundlePreviewsServices,
};
