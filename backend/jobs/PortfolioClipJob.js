const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');
const {
  PutObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3 = require('../lib/AmazonS3');
const { makePortfolioPoster, makeWorkDir, removeWorkDir } = require('../lib/MediaProcessing');
const { withDueClip } = require('../repositories/PortfolioClipRepositories');
const { portfolioProject, validateRange } = require('../services/PortfolioClipServices');

async function saveFile(key, localPath, contentType) {
  const { size } = await fs.promises.stat(localPath);
  const body = contentType.startsWith('image/')
    ? await fs.promises.readFile(localPath)
    : fs.createReadStream(localPath);
  await s3.send(new PutObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key,
    Body: body, ContentLength: size, ContentType: contentType }));
  return size;
}

function parseS3Url(url) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  const pathPart = url.pathname.replace(/^\/+/, '');
  if (!pathPart) return null;
  const virtualHosted = host.match(/^(.+)\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/);
  if (virtualHosted && virtualHosted[1]) {
    return { bucket: virtualHosted[1], key: decodeURIComponent(pathPart) };
  }
  if (/^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/.test(host)) {
    const slash = pathPart.indexOf('/');
    if (slash <= 0 || slash === pathPart.length - 1) return null;
    return {
      bucket: decodeURIComponent(pathPart.slice(0, slash)),
      key: decodeURIComponent(pathPart.slice(slash + 1)),
    };
  }
  return null;
}

async function copyFromS3(sourceBucket, sourceKey, destKey) {
  const copySource = encodeURIComponent(`${sourceBucket}/${sourceKey}`).replace(/%2F/g, '/');
  await s3.send(new CopyObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: destKey,
    CopySource: copySource,
    ContentType: 'video/mp4',
    MetadataDirective: 'REPLACE',
  }));
  const head = await s3.send(new HeadObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: destKey }));
  const size = Number(head.ContentLength);
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Copied portfolio video has invalid size');
  return size;
}

async function deleteKeyQuietly(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key })).catch(() => undefined);
}

async function fetchRenderOutput(url, renderOrigin, headers) {
  for (let hop = 0; hop < 5; hop++) {
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid render output');
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(600000),
      headers: url.origin === renderOrigin ? headers : undefined });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) break;
    url = new URL(location, url);
  }
  throw new Error('Unable to retrieve render output');
}

async function releaseRender(renderUrl, headers) {
  const response = await fetch(renderUrl, { method: 'DELETE', headers, signal: AbortSignal.timeout(15000) });
  return response.ok || response.status === 404 || response.status === 410;
}

function sanitizeErrorMessage(message) {
  return String(message || '').replace(/https?:\/\/[^\s"'<>]+/g, (raw) => {
    try {
      const parsed = new URL(raw);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return '<url>';
    }
  });
}

async function processClip(job, renderUrl, headers, state) {
  if (job.status !== 'pending') {
    state.stage = 'release-render';
    return await releaseRender(renderUrl, headers) ? { released: true } : { retry: true };
  }
  state.stage = 'fetch-status';
  const status = await fetch(renderUrl, {
    headers, signal: AbortSignal.timeout(15000),
  });
  if (status.status === 404 || status.status === 410) return { error: 'The source export expired. Please export the clip again.', released: true };
  if (!status.ok) throw new Error(`Render status unavailable (${status.status})`);
  const render = await status.json();
  if (render.status === 'failed' || render.status === 'cancelled') {
    return { error: render.errorCode === 'RENDER_TIMEOUT'
      ? 'The render timed out before the export finished.' : 'The project render failed. Please try again.' };
  }
  if (render.status !== 'completed') return {};
  if (!Array.isArray(render.data?.portfolioFrameRange)) return { error: 'The renderer did not confirm a clip range.' };

  state.stage = 'validate-project';
  const project = await portfolioProject(job.account_id, job.project_id);
  validateRange(project, job.start_ms, job.end_ms);

  const outputUrl = new URL(render.videoUrl, renderUrl.origin);
  const prefix = `profile/portfolio-clips/${job.account_id}/${job.attachment_id}`;
  const key = prefix + '.mp4';
  const posterKey = prefix + '.jpg';
  const workDir = await makeWorkDir();
  let uploadedClip = false;
  try {
    const clip = path.join(workDir, 'clip.mp4');
    const poster = path.join(workDir, 'poster.jpg');
    let size = null;
    const s3Source = parseS3Url(outputUrl);
    if (s3Source && process.env.AWS_BUCKET_NAME) {
      state.stage = 'copy-s3';
      try {
        size = await copyFromS3(s3Source.bucket, s3Source.key, key);
        uploadedClip = true;
      } catch (copyError) {
        console.warn('Portfolio clip direct S3 copy unavailable, falling back to stream transfer', {
          renderId: job.render_id,
          error: copyError?.name || 'Error',
          message: sanitizeErrorMessage(copyError?.message),
        });
      }
    }

    let posterReady = false;
    if (uploadedClip) {
      state.stage = 'make-poster-remote';
      try {
        const signedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }),
          { expiresIn: 300, signingDate: await s3.getSigningDate() },
        );
        await makePortfolioPoster(signedUrl, poster, job.start_ms, job.end_ms, project.portfolioUseDurationSeconds);
        posterReady = true;
      } catch (posterError) {
        if (posterError?.code === 'INVALID_CLIP_DURATION') throw posterError;
        console.warn('Portfolio clip remote poster probe failed, falling back to local download', {
          renderId: job.render_id,
          error: posterError?.name || 'Error',
          message: sanitizeErrorMessage(posterError?.message),
        });
      }
    }

    if (!uploadedClip || !posterReady) {
      state.stage = 'download-output';
      const output = await fetchRenderOutput(outputUrl, renderUrl.origin, headers);
      if (!output.ok || !output.body) throw new Error(`Render output unavailable (${output.status})`);
      await pipeline(Readable.fromWeb(output.body), fs.createWriteStream(clip));
      state.stage = 'make-poster';
      await makePortfolioPoster(clip, poster, job.start_ms, job.end_ms, project.portfolioUseDurationSeconds);
      if (!uploadedClip) {
        state.stage = 'upload-clip';
        size = await saveFile(key, clip, 'video/mp4');
        uploadedClip = true;
      }
    }

    state.stage = 'upload-poster';
    await saveFile(posterKey, poster, 'image/jpeg');
    return { file: { key, size }, metadata: { project_id: project.id, project_name: project.name,
      role: project.role, shared_by: project.clientName, contract_title: project.contractTitle,
      is_shared_project: project.isSharedProject, max_allowed_seconds: project.portfolioUseDurationSeconds,
      clip_start_seconds: job.start_ms / 1000, clip_end_seconds: job.end_ms / 1000, thumbnail_path: posterKey } };
  } catch (error) {
    if (uploadedClip) await deleteKeyQuietly(key);
    throw error;
  } finally { await removeWorkDir(workDir); }
}

exports.processNextPortfolioClip = () => withDueClip(async job => {
  const base = process.env.RENDER_SERVER_URL || 'http://localhost:3001';
  const headers = { 'x-user-id': job.user_id, 'x-internal-secret': process.env.INTERNAL_API_SECRET };
  const renderUrl = new URL('/renders/' + encodeURIComponent(job.render_id), base);
  const state = { stage: 'init' };
  let result;
  try { result = await processClip(job, renderUrl, headers, state); }
  catch (error) {
    if (job.status !== 'pending') return { retry: true };
    if (error.statusCode) result = { error: error.message };
    else {
      console.error('Portfolio clip processing failed', {
        renderId: job.render_id,
        stage: state.stage,
        attempt: job.failures + 1,
        error: error?.name || 'Error',
        code: error?.code || error?.cause?.code || null,
        message: sanitizeErrorMessage(error?.message),
      });
      if (job.failures < 4) return { retry: true };
      result = { error: 'Unable to prepare the portfolio video. Please try exporting again.' };
    }
  }
  if (result.error && !result.released) {
    // Keep the failure and let the worker retry cleanup if the renderer is unreachable.
    result.released = await releaseRender(renderUrl, headers).catch(() => false);
  }
  return result;
});
