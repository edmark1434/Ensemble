const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const sharp = require('sharp');

const MAX_SHORT_SIDE = 1080;
const MAX_LONG_SIDE = 1920;
const TAG_FIRST_DELAY_SECONDS = 3;
const TAG_INTERVAL_SECONDS = [12, 18];
const MAX_TAGS = 30;

function ffmpegBinary() {
  return process.env.FFMPEG_PATH || require('ffmpeg-static');
}

function ffprobeBinary() {
  return process.env.FFPROBE_PATH || require('ffprobe-static').path;
}

function run(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve(stdout);
      return reject(new Error(`${path.basename(binary)} exited with ${code}: ${stderr.trim().split('\n').slice(-4).join(' | ')}`));
    });
  });
}

async function probe(inputPath) {
  const output = await run(ffprobeBinary(), [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', inputPath,
  ]);
  const info = JSON.parse(output);
  const video = (info.streams || []).find((stream) => stream.codec_type === 'video');
  const audio = (info.streams || []).find((stream) => stream.codec_type === 'audio');
  const duration = Number(info.format?.duration) || Number(video?.duration) || Number(audio?.duration) || 0;
  let width = Number(video?.width) || 0;
  let height = Number(video?.height) || 0;
  const rotation = Math.abs(Number(
    video?.side_data_list?.find((item) => item.rotation !== undefined)?.rotation
    ?? video?.tags?.rotate ?? 0
  ));
  if (rotation === 90 || rotation === 270) [width, height] = [height, width];
  return { width, height, duration, rotation, sampleAspectRatio: video?.sample_aspect_ratio,
    hasVideo: Boolean(video), hasAudio: Boolean(audio), videoCodec: video?.codec_name, formatName: info.format?.format_name || '' };
}

const even = (value) => Math.max(2, Math.floor(value / 2) * 2);

// Fit Full HD in either orientation without enlarging smaller sources.
function cappedDimensions(width, height) {
  const scale = Math.min(1, MAX_SHORT_SIDE / Math.min(width, height), MAX_LONG_SIDE / Math.max(width, height));
  const targetWidth = even(width * scale);
  const targetHeight = even(height * scale);
  return { width: targetWidth, height: targetHeight, capped: targetWidth !== width || targetHeight !== height };
}

// Same tiled "Ensemble" pattern as the image proxy, rendered at the exact output size.
async function renderWatermarkPng(width, height, svgFactory, filePath) {
  await sharp(svgFactory(width, height)).png().toFile(filePath);
}

async function makeWorkDir() {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), 'ensemble-media-'));
}

async function removeWorkDir(dir) {
  await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => undefined);
}

// The upload policy belongs to the original, never to the watermarked derivative.
async function normalizeVideoOriginal({ inputPath, workDir }) {
  const info = await probe(inputPath);
  if (!info.hasVideo || !info.width || !info.height || !info.duration) throw new Error('The file has no readable video stream');
  const [sarWidth, sarHeight] = String(info.sampleAspectRatio || '1:1').split(':').map(Number);
  const sar = sarWidth > 0 && sarHeight > 0 ? sarWidth / sarHeight : 1;
  const rotated = info.rotation === 90 || info.rotation === 270;
  const target = cappedDimensions(info.width * (rotated ? 1 : sar), info.height * (rotated ? sar : 1));
  const needsNormalization = target.capped || info.rotation !== 0
    || (info.sampleAspectRatio && !['1:1', '0:1', 'N/A'].includes(info.sampleAspectRatio));
  if (!needsNormalization) return { ...info, originalPath: inputPath, changed: false };
  const originalPath = path.join(workDir, 'original-1080p.mp4');
  await run(ffmpegBinary(), [
    '-y', '-v', 'error', '-i', inputPath,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', `scale=${target.width}:${target.height}:flags=lanczos,setsar=1`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-metadata:s:v:0', 'rotate=0',
    '-movflags', '+faststart', originalPath,
  ]);
  const result = await probe(originalPath);
  if (result.width !== target.width || result.height !== target.height) throw new Error('Video normalization produced unexpected dimensions');
  return { ...result, originalPath, changed: true };
}

// Always watermark at the original's exact dimensions, including any future
// higher-resolution originals. No upload policy or resize belongs in this step.
async function createVideoProxy({ inputPath, workDir, createWatermarkSvg, createImageThumbnail }) {
  const info = await probe(inputPath);
  if (!info.hasVideo || !info.width || !info.height || !info.duration) throw new Error('The file has no readable video stream');
  const watermarkPath = path.join(workDir, 'watermark.png');
  await renderWatermarkPng(info.width, info.height, createWatermarkSvg, watermarkPath);
  const proxyPath = path.join(workDir, 'proxy.mp4');
  const args = [
    '-y', '-v', 'error', '-i', inputPath, '-i', watermarkPath,
    '-filter_complex', '[0:v:0][1:v:0]overlay=0:0:format=auto,format=yuv420p[vw]',
    '-map', '[vw]', '-map', '0:a:0?',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', proxyPath,
  ];
  await run(ffmpegBinary(), args);
  const proxyInfo = await probe(proxyPath);
  if (proxyInfo.width !== info.width || proxyInfo.height !== info.height) {
    throw new Error('Video proxy dimensions do not match the original');
  }

  const framePath = path.join(workDir, 'frame.jpg');
  // Very short clips may have no frame after the midpoint (audio can outlast video).
  const seek = info.duration < 2 ? 0 : 1;
  await run(ffmpegBinary(), ['-y', '-v', 'error', '-ss', String(seek), '-i', inputPath, '-frames:v', '1', '-q:v', '2', framePath]);
  const thumbnail = await createImageThumbnail(await fs.promises.readFile(framePath));

  return {
    width: info.width,
    height: info.height,
    durationSeconds: Math.max(1, Math.round(info.duration)),
    proxyPath,
    thumbnail,
  };
}

// Upload completion already enforces the original's resolution policy.
async function processVideo(options) {
  return { ...(await createVideoProxy(options)), cappedOriginalPath: null };
}

function tagDelays(durationSeconds) {
  const delays = [];
  let at = Math.min(TAG_FIRST_DELAY_SECONDS, Math.max(0, durationSeconds * 0.2));
  while (at < durationSeconds - 1 && delays.length < MAX_TAGS) {
    delays.push(Math.round(at * 1000));
    const [low, high] = TAG_INTERVAL_SECONDS;
    at += low + Math.random() * (high - low);
  }
  return delays;
}

// The producer tag is one short clip, mixed in at intervals (first one near the start).
async function processAudio({ inputPath, workDir, tagPath }) {
  const info = await probe(inputPath);
  if (!info.hasAudio || !info.duration) throw new Error('The file has no readable audio stream');
  // The tag clip is optional while the final producer recording is unavailable.
  const includeTag = Boolean(tagPath && fs.existsSync(tagPath));
  const delays = includeTag ? tagDelays(info.duration) : [];
  const proxyPath = path.join(workDir, 'proxy.mp3');
  const inputs = ['-i', inputPath];
  const parts = [];
  delays.forEach((delay, index) => {
    inputs.push('-i', tagPath);
    parts.push(`[${index + 1}:a]volume=2.0,aformat=sample_rates=44100:channel_layouts=stereo,adelay=${delay}:all=1[t${index}]`);
  });
  const args = ['-y', '-v', 'error', ...inputs];
  if (delays.length > 0) {
    const mixInputs = ['[0:a]aformat=sample_rates=44100:channel_layouts=stereo[m]', ...parts]
      .join(';');
    const labels = ['[m]', ...delays.map((_, index) => `[t${index}]`)].join('');
    const graph = `${mixInputs};${labels}amix=inputs=${delays.length + 1}:duration=first:normalize=0[out]`;
    args.push('-filter_complex', graph, '-map', '[out]');
  } else {
    args.push('-map', '0:a:0');
  }
  args.push('-c:a', 'libmp3lame', '-b:a', '96k', proxyPath);
  await run(ffmpegBinary(), args);
  return { proxyPath, durationSeconds: Math.max(1, Math.round(info.duration)), tagCount: delays.length };
}

module.exports = {
  probe,
  cappedDimensions,
  normalizeVideoOriginal,
  createVideoProxy,
  processVideo,
  processAudio,
  makeWorkDir,
  removeWorkDir,
  randomName: () => crypto.randomUUID(),
};
