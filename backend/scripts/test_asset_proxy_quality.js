const assert = require('node:assert/strict');
const { test } = require('node:test');
const sharp = require('sharp');
const { createWatermarkedProxy, createWatermarkSvg } = require('../services/AssetPreviewServices');
const { cappedDimensions } = require('../lib/MediaProcessing');

const source = (width, height) => sharp({
  create: { width, height, channels: 4, background: { r: 120, g: 80, b: 50, alpha: 1 } },
});

test('image proxies fit Full HD in either orientation without enlargement', async () => {
  for (const [width, height, expectedWidth, expectedHeight] of [
    [2560, 1440, 1920, 1080],
    [1440, 2560, 1080, 1920],
    [1600, 1600, 1080, 1080],
    [2400, 600, 1920, 480],
    [320, 180, 320, 180],
  ]) {
    const result = await createWatermarkedProxy(await source(width, height).png().toBuffer());
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.width, expectedWidth);
    assert.equal(metadata.height, expectedHeight);
    assert.equal(metadata.format, 'webp');
    const videoSize = cappedDimensions(width, height);
    assert.equal(videoSize.width, expectedWidth);
    assert.equal(videoSize.height, expectedHeight);
  }
});

test('image orientation is applied before choosing the resolution bounds', async () => {
  const input = await source(2560, 1440).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const metadata = await sharp(await createWatermarkedProxy(input)).metadata();
  assert.equal(metadata.width, 1080);
  assert.equal(metadata.height, 1920);
});

test('proxy encoding preserves the composed pixels and the dark outline', async () => {
  const input = await source(320, 180).png().toBuffer();
  const watermark = createWatermarkSvg(320, 180);
  assert.match(watermark.toString(), /stroke="#000000" stroke-opacity="0.35"/);
  const expected = await sharp(input).composite([{ input: watermark }]).ensureAlpha().raw().toBuffer();
  const actual = await sharp(await createWatermarkedProxy(input)).ensureAlpha().raw().toBuffer();
  assert.deepEqual(actual, expected);
});
