const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../lib/AmazonS3');
const { makePortfolioPoster, makeWorkDir, removeWorkDir } = require('../lib/MediaProcessing');
const { withDueClip } = require('../repositories/PortfolioClipRepositories');
const { portfolioProject, validateRange } = require('../services/PortfolioClipServices');

async function saveFile(key, localPath, contentType) {
  const { size } = await fs.promises.stat(localPath);
  await s3.send(new PutObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key,
    Body: fs.createReadStream(localPath), ContentLength: size, ContentType: contentType }));
  return size;
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

async function processClip(job) {
  const base = process.env.RENDER_SERVER_URL || 'http://localhost:3001';
  const headers = { 'x-user-id': job.user_id, 'x-internal-secret': process.env.INTERNAL_API_SECRET };
  const renderUrl = new URL('/renders/' + encodeURIComponent(job.render_id), base);
  if (job.status !== 'pending') {
    const deleted = await fetch(renderUrl, { method: 'DELETE', headers, signal: AbortSignal.timeout(15000) });
    return deleted.ok || deleted.status === 404 ? { released: true } : { retry: true };
  }
  const status = await fetch(renderUrl, {
    headers, signal: AbortSignal.timeout(15000),
  });
  if (status.status === 404 || status.status === 410) return { error: 'The source export expired. Please export the clip again.' };
  if (!status.ok) throw new Error('Render status unavailable');
  const render = await status.json();
  if (render.status === 'failed' || render.status === 'cancelled') return { error: 'The project render failed. Please try again.' };
  if (render.status !== 'completed') return {};
  if (!Array.isArray(render.data?.portfolioFrameRange)) return { error: 'The renderer did not confirm a clip range.' };

  const outputUrl = new URL(render.videoUrl, base);
  const workDir = await makeWorkDir();
  try {
    const clip = path.join(workDir, 'clip.mp4');
    const poster = path.join(workDir, 'poster.jpg');
    const output = await fetchRenderOutput(outputUrl, new URL(base).origin, headers);
    if (!output.ok || !output.body) throw new Error('Render output unavailable');
    await pipeline(Readable.fromWeb(output.body), fs.createWriteStream(clip));
    await makePortfolioPoster(clip, poster, job.start_ms, job.end_ms);
    const project = await portfolioProject(job.account_id, job.project_id);
    validateRange(project, job.start_ms, job.end_ms);
    const prefix = `profile/portfolio-clips/${job.account_id}/${job.attachment_id}`;
    const key = prefix + '.mp4';
    const posterKey = prefix + '.jpg';
    const size = await saveFile(key, clip, 'video/mp4');
    await saveFile(posterKey, poster, 'image/jpeg');
    return { file: { key, size }, metadata: { project_id: project.id, project_name: project.name,
      role: project.role, shared_by: project.clientName, contract_title: project.contractTitle,
      is_shared_project: project.isSharedProject, max_allowed_seconds: project.portfolioUseDurationSeconds,
      clip_start_seconds: job.start_ms / 1000, clip_end_seconds: job.end_ms / 1000, thumbnail_path: posterKey } };
  } finally { await removeWorkDir(workDir); }
}

exports.processNextPortfolioClip = () => withDueClip(async job => {
  try { return await processClip(job); }
  catch (error) {
    if (job.status !== 'pending') return { retry: true };
    if (error.statusCode) return { error: error.message };
    console.error('Portfolio clip processing failed', { renderId: job.render_id, error: error.name });
    return job.failures >= 4 ? { error: 'Unable to prepare the portfolio video. Please try exporting again.' } : { retry: true };
  }
});
