import assert from "node:assert/strict";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizeVideoOriginal, readVideoMetadata } from "./video-original";

const execute = promisify(execFile);
const binary = process.env.FFMPEG_PATH || "ffmpeg";

for (const [source, expected, changed] of [
  ["2560x1440", [1920, 1080], true],
  ["1440x2560", [1080, 1920], true],
  ["1440x1440", [1080, 1080], true],
  ["2560x1080", [1920, 810], true],
  ["640x360", [640, 360], false],
] as const) {
  test(`editor original ${source} finalizes at ${expected.join('x')}`, async () => {
    const workDir = await mkdtemp(path.join(os.tmpdir(), "ensemble-video-test-"));
    try {
      const inputPath = path.join(workDir, "source.mp4");
      await execute(binary, [
        "-y", "-v", "error", "-f", "lavfi", "-i", `color=blue:s=${source}:r=5:d=0.4`,
        "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", inputPath,
      ], { windowsHide: true });
      const before = await readFile(inputPath);
      const result = await normalizeVideoOriginal(inputPath, workDir);
      assert.deepEqual([result.width, result.height], expected);
      assert.equal(result.changed, changed);
      assert.deepEqual(await readFile(inputPath), before);
      if (!changed) assert.equal(result.originalPath, inputPath);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  });
}

test("editor rejects a non-video upload", async () => {
  const workDir = await mkdtemp(path.join(os.tmpdir(), "ensemble-video-test-"));
  try {
    const inputPath = path.join(workDir, "invalid.mp4");
    await writeFile(inputPath, "not a video");
    await assert.rejects(normalizeVideoOriginal(inputPath, workDir));
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
});

test("editor bakes rotation into capped portrait dimensions", async () => {
  const workDir = await mkdtemp(path.join(os.tmpdir(), "ensemble-video-test-"));
  try {
    const source = path.join(workDir, "source.mp4");
    const inputPath = path.join(workDir, "rotated.mp4");
    await execute(binary, ["-y", "-v", "error", "-f", "lavfi", "-i", "color=blue:s=2560x1440:r=5:d=0.4", "-c:v", "libx264", "-preset", "ultrafast", source], { windowsHide: true });
    await execute(binary, ["-y", "-v", "error", "-display_rotation:v:0", "90", "-i", source, "-c", "copy", inputPath], { windowsHide: true });
    assert.equal((await readVideoMetadata(inputPath)).rotation, 90, 'fixture must carry rotation metadata');
    const result = await normalizeVideoOriginal(inputPath, workDir);
    assert.deepEqual([result.width, result.height, result.rotation], [1080, 1920, 0]);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
});

test("editor preserves the display aspect ratio of non-square pixels", async () => {
  const workDir = await mkdtemp(path.join(os.tmpdir(), "ensemble-video-test-"));
  try {
    const inputPath = path.join(workDir, "source.mp4");
    await execute(binary, [
      "-y", "-v", "error", "-f", "lavfi", "-i", "color=blue:s=720x576:r=5:d=0.4",
      "-vf", "setsar=16/15", "-c:v", "libx264", inputPath,
    ], { windowsHide: true });
    const result = await normalizeVideoOriginal(inputPath, workDir);
    assert.deepEqual([result.width, result.height, result.sampleAspectRatio], [768, 576, "1:1"]);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
});
