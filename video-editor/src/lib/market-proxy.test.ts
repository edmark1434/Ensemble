import assert from "node:assert/strict";
import { test } from "node:test";
import { isGeneratedMarketProxy } from "./market-proxy";

test("only generated proxies matching the asset media type can be inserted", () => {
  for (const type of ["image", "video", "audio"]) {
    assert.equal(isGeneratedMarketProxy(type, "original", "proxy", "assets/proxies/file", `${type}/test`), true);
  }
  assert.equal(isGeneratedMarketProxy("image", "original", "original", "assets/proxies/file", "image/webp"), false);
  assert.equal(isGeneratedMarketProxy("video", "original", "cover", "assets/proxies/cover.webp", "image/webp"), false);
  assert.equal(isGeneratedMarketProxy("video", "original", "proxy", "asset-originals/file.mp4", "video/mp4"), false);
  assert.equal(isGeneratedMarketProxy("video", "original", "proxy", "assets/proxies/../original.mp4", "video/mp4"), false);
  assert.equal(isGeneratedMarketProxy("video", "original", null, null, null), false);
});
