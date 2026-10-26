const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const sharp = require('sharp');
const { processVideo, normalizeVideoOriginal, makeWorkDir, removeWorkDir, probe } = require('../lib/MediaProcessing');
const { createWatermarkSvg, createImageThumbnail } = require('../services/AssetPreviewServices');
const execute = promisify(execFile);

test('video processing burns in a watermark and leaves an in-cap original untouched', async () => {
  const workDir = await makeWorkDir();
  try {
    const binary = process.env.FFMPEG_PATH || require('ffmpeg-static');
    const inputPath = path.join(workDir, 'source.mp4');
    await execute(binary, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=black:s=640x360:r=5:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', inputPath], { windowsHide: true });
    const original = await fs.readFile(inputPath);
    const normalized = await normalizeVideoOriginal({ inputPath, workDir });
    assert.equal(normalized.changed, false);
    assert.equal(normalized.originalPath, inputPath);
    const result = await processVideo({ inputPath, workDir, createWatermarkSvg, createImageThumbnail });
    assert.equal(result.cappedOriginalPath, null);
    assert.deepEqual(await fs.readFile(inputPath), original);
    assert.equal((await probe(result.proxyPath)).width, 640);
    const thumbnailInfo = await sharp(result.thumbnail).metadata();
    assert.deepEqual([thumbnailInfo.width, thumbnailInfo.height], [320, 180]);
    assert.ok((await sharp(result.thumbnail).stats()).channels[0].max < 5, 'thumbnail uses the unwatermarked source');
    const frame = path.join(workDir, 'proxy-frame.png');
    await execute(binary, ['-y', '-v', 'error', '-i', result.proxyPath, '-frames:v', '1', frame], { windowsHide: true });
    const stats = await sharp(frame).stats();
    // The source is black; visible bright pixels confirm the overlay was burned in.
    assert.ok(stats.channels[0].max > 80);
    assert.ok(stats.channels[0].mean > 1);
  } finally {
    await removeWorkDir(workDir);
  }
});

for (const [source, expected] of [
  ['2560x1440', [1920, 1080]],
  ['1440x2560', [1080, 1920]],
  ['1440x1440', [1080, 1080]],
  ['2560x1080', [1920, 810]],
]) {
  test(`market original ${source} is capped before its same-size watermark`, async () => {
    const workDir = await makeWorkDir();
    try {
      const inputPath = path.join(workDir, 'source.mp4');
      await execute(process.env.FFMPEG_PATH || require('ffmpeg-static'), [
        '-y', '-v', 'error', '-f', 'lavfi', '-i', `color=blue:s=${source}:r=5:d=0.4`,
        '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.4',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', inputPath,
      ], { windowsHide: true });
      const normalized = await normalizeVideoOriginal({ inputPath, workDir });
      assert.equal(normalized.changed, true);
      assert.deepEqual([normalized.width, normalized.height], expected);
      assert.equal(normalized.hasAudio, true);
      const result = await processVideo({ inputPath: normalized.originalPath, workDir, createWatermarkSvg, createImageThumbnail });
      const proxy = await probe(result.proxyPath);
      assert.deepEqual([proxy.width, proxy.height], expected);
      assert.equal(proxy.hasAudio, true);
      assert.equal(result.cappedOriginalPath, null);
    } finally {
      await removeWorkDir(workDir);
    }
  });
}

test('watermark generation alone never downscales a higher-resolution original', async () => {
  const workDir = await makeWorkDir();
  try {
    const inputPath = path.join(workDir, 'source.mp4');
    await execute(process.env.FFMPEG_PATH || require('ffmpeg-static'), [
      '-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=black:s=2560x1440:r=5:d=0.4',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', inputPath,
    ], { windowsHide: true });
    const result = await processVideo({ inputPath, workDir, createWatermarkSvg, createImageThumbnail });
    const proxy = await probe(result.proxyPath);
    assert.deepEqual([proxy.width, proxy.height], [2560, 1440]);
    assert.equal(result.cappedOriginalPath, null);
  } finally {
    await removeWorkDir(workDir);
  }
});

test('market original bakes rotation into portrait dimensions before watermarking', async () => {
  const workDir = await makeWorkDir();
  try {
    const binary = process.env.FFMPEG_PATH || require('ffmpeg-static');
    const source = path.join(workDir, 'source.mp4');
    const inputPath = path.join(workDir, 'rotated.mp4');
    await execute(binary, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=blue:s=2560x1440:r=5:d=0.4', '-c:v', 'libx264', '-preset', 'ultrafast', source], { windowsHide: true });
    await execute(binary, ['-y', '-v', 'error', '-display_rotation:v:0', '90', '-i', source, '-c', 'copy', inputPath], { windowsHide: true });
    assert.equal((await probe(inputPath)).rotation, 90, 'fixture must carry rotation metadata');
    const normalized = await normalizeVideoOriginal({ inputPath, workDir });
    assert.deepEqual([normalized.width, normalized.height, normalized.rotation], [1080, 1920, 0]);
    const result = await processVideo({ inputPath: normalized.originalPath, workDir, createWatermarkSvg, createImageThumbnail });
    const proxy = await probe(result.proxyPath);
    assert.deepEqual([proxy.width, proxy.height], [1080, 1920]);
  } finally {
    await removeWorkDir(workDir);
  }
});

test('market normalization preserves the display aspect ratio of non-square pixels', async () => {
  const workDir = await makeWorkDir();
  try {
    const inputPath = path.join(workDir, 'source.mp4');
    await execute(process.env.FFMPEG_PATH || require('ffmpeg-static'), [
      '-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=blue:s=720x576:r=5:d=0.4',
      '-vf', 'setsar=16/15', '-c:v', 'libx264', inputPath,
    ], { windowsHide: true });
    const result = await normalizeVideoOriginal({ inputPath, workDir });
    assert.deepEqual([result.width, result.height, result.sampleAspectRatio], [768, 576, '1:1']);
  } finally {
    await removeWorkDir(workDir);
  }
});
