const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const sharp = require('sharp');
const { createImageThumbnail } = require('../services/AssetPreviewServices');
const { createVideoThumbnail, createAudioThumbnail, processAudio, probe, makeWorkDir, removeWorkDir } = require('../lib/MediaProcessing');
const execute = promisify(execFile);
const ffmpeg = process.env.FFMPEG_PATH || require('ffmpeg-static');

test('video previews are silent unwatermarked MP4s, capped at five seconds and 320px without upscaling', async () => {
  const workDir = await makeWorkDir();
  try {
    for (const [width, height, duration, expected] of [[640, 360, 7, [320, 180]], [360, 640, 2, [180, 320]], [160, 90, 1, [160, 90]]]) {
      const inputPath = path.join(workDir, 'input.mp4');
      await execute(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', `color=c=gray:s=${width}x${height}:r=15`,
        '-f', 'lavfi', '-i', 'sine=frequency=440', '-t', String(duration), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', inputPath], { windowsHide: true });
      const original = await fs.readFile(inputPath);
      const bytes = await createVideoThumbnail({ inputPath, workDir });
      const previewPath = path.join(workDir, 'result.mp4');
      await fs.writeFile(previewPath, bytes);
      const info = await probe(previewPath);
      assert.deepEqual([info.width, info.height], expected);
      assert.equal(info.hasAudio, false);
      assert.equal(info.videoCodec, 'h264');
      assert.ok(Math.abs(info.duration - Math.min(5, duration)) < 0.1);
      const framePath = path.join(workDir, 'frame.png');
      await execute(ffmpeg, ['-y', '-v', 'error', '-i', previewPath, '-frames:v', '1', framePath], { windowsHide: true });
      const stats = await sharp(framePath).stats();
      assert.ok(stats.channels.every(channel => channel.stdev < 1), 'uniform original stays unwatermarked');
      assert.deepEqual(await fs.readFile(inputPath), original);
    }
  } finally { await removeWorkDir(workDir); }
});

test('menu thumbnails fit 320px, preserve aspect ratio and remain unwatermarked', async () => {
  for (const [width, height, expected] of [[1600, 900, [320, 180]], [900, 1600, [180, 320]],
    [2400, 600, [320, 80]], [90, 60, [90, 60]]]) {
    const source = await sharp({ create: { width, height, channels: 3, background: '#555555' } }).png().toBuffer();
    const thumbnail = await createImageThumbnail(source);
    const metadata = await sharp(thumbnail).metadata();
    assert.deepEqual([metadata.width, metadata.height], expected);
    assert.equal(metadata.format, 'webp');
    const stats = await sharp(thumbnail).stats();
    assert.ok(stats.channels.every((channel) => channel.stdev < 1), 'no watermark on the uniform thumbnail');
  }
});

test('audio menu preview is capped at 30 seconds and excludes the full proxy producer tag', async () => {
  const workDir = await makeWorkDir();
  try {
    const inputPath = path.join(workDir, 'original.wav');
    const tagPath = path.join(workDir, 'tag.wav');
    await execute(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '45', inputPath], { windowsHide: true });
    await execute(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=0.3', tagPath], { windowsHide: true });
    const original = await fs.readFile(inputPath);
    const result = await processAudio({ inputPath, workDir, tagPath });
    const preview = await probe(result.thumbnailPath);
    const proxy = await probe(result.proxyPath);
    assert.ok(preview.duration >= 30 && preview.duration < 30.1);
    assert.ok(proxy.duration >= 45 && proxy.duration < 45.1);
    assert.ok(result.tagCount > 0);
    for (const [file, shouldBeSilent] of [[result.thumbnailPath, true], [result.proxyPath, false]]) {
      const pcmPath = path.join(workDir, shouldBeSilent ? 'preview.pcm' : 'proxy.pcm');
      await execute(ffmpeg, ['-y', '-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', pcmPath], { windowsHide: true });
      const pcm = await fs.readFile(pcmPath);
      let max = 0;
      for (let index = 0; index < pcm.length; index += 2) max = Math.max(max, Math.abs(pcm.readInt16LE(index)));
      assert.equal(max < 10, shouldBeSilent, 'only the proxy contains the audible tag');
    }
    assert.deepEqual(await fs.readFile(inputPath), original);
  } finally { await removeWorkDir(workDir); }
});

test('audio previews do not pad short tracks to 30 seconds', async () => {
  const workDir = await makeWorkDir();
  try {
    const inputPath = path.join(workDir, 'short.wav');
    await execute(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', inputPath], { windowsHide: true });
    const preview = await probe(await createAudioThumbnail({ inputPath, workDir }));
    assert.ok(preview.duration >= 2 && preview.duration < 2.1);
  } finally { await removeWorkDir(workDir); }
});
