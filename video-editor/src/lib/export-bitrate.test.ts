import assert from "node:assert/strict";
import { test } from "node:test";
import { getDefaultVideoBitrateKbps, getMaxVideoBitrateKbps } from "../features/editor/constants/download-options";
import { getVideoExportBitrateError } from "./export-bitrate";

const video = { type: "video", format: "mp4", size: { width: 1920, height: 1080 }, resolution: 720, fps: 30, bitrate: 3318 };

test("video bitrate caps follow resolution, FPS and aspect ratio, up to 96 Mbps", () => {
  assert.equal(getDefaultVideoBitrateKbps(1920, 1080, 720, 30), 3318);
  assert.equal(getMaxVideoBitrateKbps(1920, 1080, 720, 30), 16590);
  assert.equal(getMaxVideoBitrateKbps(1920, 1080, 720, 60), 33180);
  assert.equal(getMaxVideoBitrateKbps(1920, 1080, 1080, 30), 37325);
  assert.equal(getMaxVideoBitrateKbps(1080, 1920, 720, 30), 16590);
  assert.equal(getMaxVideoBitrateKbps(1080, 1080, 720, 30), 9330);
  assert.equal(getMaxVideoBitrateKbps(1920, 1080, 2160, 60), 96000);
});

test("the export boundary accepts the cap and rejects one kbps over it", () => {
  assert.equal(getVideoExportBitrateError({ ...video, bitrate: 16590 }), null);
  assert.match(getVideoExportBitrateError({ ...video, bitrate: 16591 }) ?? "", /16\.59 Mbps/);
  assert.equal(getVideoExportBitrateError({ ...video, resolution: 2160, fps: 60, bitrate: 96000 }), null);
  assert.match(getVideoExportBitrateError({ ...video, resolution: 2160, fps: 60, bitrate: 96001 }) ?? "", /96 Mbps/);
});

test("invalid numeric settings cannot bypass the bitrate cap", () => {
  for (const bitrate of [null, undefined, "16590", Number.NaN, Number.POSITIVE_INFINITY, -1, 999]) {
    assert.equal(getVideoExportBitrateError({ ...video, bitrate }), "Invalid video bitrate settings.");
  }
  for (const settings of [{ fps: 0 }, { resolution: Number.NaN }, { size: { width: 0, height: 1080 } }]) {
    assert.equal(getVideoExportBitrateError({ ...video, ...settings }), "Invalid video bitrate settings.");
  }
});

test("audio, GIF and ProRes retain their existing bitrate handling", () => {
  assert.equal(getVideoExportBitrateError({ type: "audio" }), null);
  assert.equal(getVideoExportBitrateError({ type: "video", format: "gif" }), null);
  assert.equal(getVideoExportBitrateError({ type: "video", format: "mov" }), null);
});
