const crypto = require('crypto');
const fontkit = require('fontkit');
const sharp = require('sharp');
const watermarkFont = fontkit.openSync(require.resolve(
  '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2'
));
const watermarkTextRun = watermarkFont.layout('Ensemble');
const {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const s3 = require('../lib/AmazonS3');
const {
  findOwnedUploadedFilesRepository,
  listAssetDerivativeBackfillCandidatesRepository,
  replaceMediaAssetDerivativesRepository,
} = require('../repositories/AssetPreviewRepositories');

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const THUMBNAIL_SIZE = 320;
const THUMBNAIL_QUALITY = 70;
const PROXY_SHORT_SIDE = 1080;
const PROXY_LONG_SIDE = 1920;
const DERIVATIVE_CONCURRENCY = 3;
const INPUT_OPTIONS = { limitInputPixels: 50_000_000, failOn: 'error' };

function derivativeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

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
    throw derivativeError('ASSET_IMAGE_UNPROCESSABLE', 'Unsupported protected original path');
  }
  return value;
}

async function objectBodyToBuffer(body) {
  if (!body) throw derivativeError('ASSET_IMAGE_UNPROCESSABLE', 'The protected original returned no content');
  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

// "Ensemble" tiled across the whole image, staggered rows, rotated.
function createWatermarkSvg(width, height) {
  const fontSize = Math.max(14, Math.round(Math.min(width, height) * 0.06));
  const stepX = fontSize * 11;
  const stepY = fontSize * 3.25;
  const scale = fontSize / watermarkFont.unitsPerEm;
  let advance = 0;
  const textPaths = watermarkTextRun.glyphs.map((glyph, index) => {
    const position = watermarkTextRun.positions[index];
    const x = (advance + position.xOffset) * scale;
    const y = -position.yOffset * scale;
    advance += position.xAdvance;
    return `<path d="${glyph.path.toSVG()}" transform="translate(${x} ${y}) scale(${scale} ${-scale})"/>`;
  }).join('');
  const text = (x, y) => `<g transform="translate(${x} ${y})" fill="#f8fafc" fill-opacity="0.52">${textPaths}</g>`;
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="ensemble" width="${stepX}" height="${stepY}"
          patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
          ${text(0, fontSize)}
          ${text(Math.round(stepX / 2), fontSize + Math.round(stepY / 2))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ensemble)" />
    </svg>
  `);
}

async function createImageThumbnail(sourceBuffer) {
  return sharp(sourceBuffer, INPUT_OPTIONS)
    .rotate()
    .resize({
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: THUMBNAIL_QUALITY, effort: 4 })
    .toBuffer();
}

async function createWatermarkedProxy(sourceBuffer) {
  const metadata = await sharp(sourceBuffer, INPUT_OPTIONS).metadata();
  const swapsAxes = Number(metadata.orientation) >= 5 && Number(metadata.orientation) <= 8;
  const width = swapsAxes ? metadata.height : metadata.width;
  const height = swapsAxes ? metadata.width : metadata.height;
  const portrait = height > width;
  // Composite on raw resized pixels to avoid compressing the image twice.
  const { data: resized, info } = await sharp(sourceBuffer, INPUT_OPTIONS)
    .rotate()
    .resize({
      width: portrait ? PROXY_SHORT_SIDE : PROXY_LONG_SIDE,
      height: portrait ? PROXY_LONG_SIDE : PROXY_SHORT_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return sharp(resized, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .composite([{ input: createWatermarkSvg(info.width, info.height) }])
    .webp({ lossless: true, effort: 4 })
    .toBuffer();
}

async function putDerivative(prefix, baseName, suffix, bytes) {
  const key = `${prefix}/${crypto.randomUUID()}.webp`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: bytes,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }), { abortSignal: AbortSignal.timeout(120_000) });
  return {
    name: `${baseName}-${suffix}.webp`,
    path: key,
    mimeType: 'image/webp',
    sizeBytes: bytes.length,
  };
}

async function deleteKeys(keys) {
  await Promise.all(keys.filter(Boolean).map((key) => s3.send(new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  }), { abortSignal: AbortSignal.timeout(15_000) }).catch(() => undefined)));
}

async function readImageOriginal(file) {
  const declaredSize = Number(file.size_bytes);
  if (!Number.isSafeInteger(declaredSize) || declaredSize < 1 || declaredSize > MAX_SOURCE_BYTES) {
    throw derivativeError('ASSET_IMAGE_UNPROCESSABLE', 'The original image exceeds the processing limit');
  }
  const source = await s3.send(new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: assertSafeObjectKey(file.path),
  }), { abortSignal: AbortSignal.timeout(120_000) });
  const buffer = await objectBodyToBuffer(source.Body);
  if (buffer.length < 1 || buffer.length > MAX_SOURCE_BYTES) {
    throw derivativeError('ASSET_IMAGE_UNPROCESSABLE', 'The original image size is invalid');
  }
  return buffer;
}

async function generateShowcaseThumbnail(file) {
  const bytes = await createImageThumbnail(await readImageOriginal(file));
  return { thumbnail: await putDerivative('assets/thumbnails/320', safeBaseName(file.name), 'thumbnail-320px', bytes) };
}

// file: { file_id, name, path, size_bytes } of a protected original image
async function generateImageDerivatives(file) {
  const buffer = await readImageOriginal(file);

  let thumbnailBytes;
  let proxyBytes;
  let width;
  let height;
  try {
    const metadata = await sharp(buffer, INPUT_OPTIONS).metadata();
    if (!metadata.width || !metadata.height) throw new Error('invalid dimensions');
    const swapsAxes = Number(metadata.orientation) >= 5 && Number(metadata.orientation) <= 8;
    width = swapsAxes ? metadata.height : metadata.width;
    height = swapsAxes ? metadata.width : metadata.height;
    [thumbnailBytes, proxyBytes] = await Promise.all([
      createImageThumbnail(buffer),
      createWatermarkedProxy(buffer),
    ]);
  } catch (error) {
    throw derivativeError('ASSET_IMAGE_UNPROCESSABLE', `The image could not be processed: ${error.message}`);
  }

  const baseName = safeBaseName(file.name);
  const uploaded = [];
  try {
    const results = await Promise.allSettled([
      putDerivative('assets/thumbnails/320', baseName, 'thumbnail-320px', thumbnailBytes),
      putDerivative('assets/proxies/v2', baseName, 'proxy-ensemble-1080p', proxyBytes),
    ]);
    for (const result of results) {
      if (result.status === 'fulfilled') uploaded.push(result.value.path);
    }
    const failure = results.find((result) => result.status === 'rejected');
    if (failure) throw failure.reason;
    const [thumbnail, proxy] = results.map((result) => result.value);
    return { originalFileId: String(file.file_id), width, height, thumbnail, proxy };
  } catch (error) {
    await deleteKeys(uploaded);
    throw error;
  }
}

async function discardImageDerivatives(derivatives) {
  if (!derivatives || derivatives.size === 0) return;
  await deleteKeys([...derivatives.values()].flatMap((item) => [item.thumbnail.path, item.proxy.path]));
}

// Generates derivatives for every image original before the DB transaction opens.
// Returns Map<originalFileId, derivative>. Anything uploaded is cleaned up on failure.
async function prepareImageDerivatives(accountId, originalFileIds) {
  const derivatives = new Map();
  if (!originalFileIds || originalFileIds.length === 0) return derivatives;
  if (!process.env.AWS_BUCKET_NAME) throw new Error('AWS_BUCKET_NAME is required');

  const owned = await findOwnedUploadedFilesRepository(accountId, originalFileIds);
  const images = owned.filter((file) => file.mime_type?.startsWith('image/')
    && file.path?.startsWith('asset-originals/'));
  try {
    for (let index = 0; index < images.length; index += DERIVATIVE_CONCURRENCY) {
      const batch = images.slice(index, index + DERIVATIVE_CONCURRENCY);
      const results = await Promise.allSettled(batch.map(generateImageDerivatives));
      for (const result of results) {
        if (result.status === 'fulfilled') derivatives.set(result.value.originalFileId, result.value);
      }
      const failed = results.find((result) => result.status === 'rejected');
      if (failed) throw failed.reason;
    }
    return derivatives;
  } catch (error) {
    await discardImageDerivatives(derivatives);
    throw error;
  }
}

async function backfillAssetDerivativesServices({ limit = 1000, dryRun = false } = {}) {
  if (!process.env.AWS_BUCKET_NAME) throw new Error('AWS_BUCKET_NAME is required');
  const safeLimit = Math.min(5000, Math.max(1, Number.parseInt(limit, 10) || 1000));
  const candidates = await listAssetDerivativeBackfillCandidatesRepository(safeLimit);
  const result = { candidates: candidates.length, updated: 0, skipped: 0, failed: [] };
  if (dryRun) return result;
  for (const candidate of candidates) {
    let derivative;
    try {
      derivative = await generateImageDerivatives({
        file_id: candidate.original_file_id,
        name: candidate.original_name,
        path: candidate.original_path,
        size_bytes: candidate.original_size_bytes,
      });
      const replaced = await replaceMediaAssetDerivativesRepository({
        mediaAssetId: candidate.media_asset_id,
        expectedProxyFileId: candidate.proxy_file_id,
        expectedThumbnailFileId: candidate.thumbnail_file_id,
        width: derivative.width,
        height: derivative.height,
        thumbnail: derivative.thumbnail,
        proxy: derivative.proxy,
      });
      if (replaced) {
        result.updated += 1;
      } else {
        await deleteKeys([derivative.thumbnail.path, derivative.proxy.path]);
        result.skipped += 1;
      }
    } catch (error) {
      if (derivative) await deleteKeys([derivative.thumbnail.path, derivative.proxy.path]);
      result.failed.push({
        mediaAssetId: candidate.media_asset_id,
        error: error instanceof Error ? error.message : 'Unknown derivative error',
      });
    }
  }
  return result;
}

module.exports = {
  createWatermarkSvg,
  createImageThumbnail,
  createWatermarkedProxy,
  generateImageDerivatives,
  generateShowcaseThumbnail,
  prepareImageDerivatives,
  discardImageDerivatives,
  backfillAssetDerivativesServices,
};
