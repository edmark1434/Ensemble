import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ITrackItem } from "@designcombo/types";
import { PrepareMarketImages } from "../components/prepared-market-images";
import { marketPlaybackSource, readyMarketPlaybackSource } from "./market-playback-source";

const item = (type: string) => ({ type, details: { src: "/watermarked" },
  metadata: { market: true, market_asset_id: "asset", media_asset_id: "media" } }) as unknown as ITrackItem;
const licensed = { assetId: "asset", name: "Asset", priceCredits: 10, licensed: true };

test("canvas mounts immediately even when none of the market images are prepared", () => {
  const html = renderToStaticMarkup(createElement(PrepareMarketImages, {
    sourcesKey: JSON.stringify(["/slow-image", "/failed-image"]),
    children: createElement("div", { id: "canvas" }, "Canvas and existing layers"),
  }));
  assert.equal(html, '<div id="canvas">Canvas and existing layers</div>');
});

test("unknown licenses never select the watermarked fallback", () => {
  for (const type of ["image", "video", "audio"]) {
    assert.equal(readyMarketPlaybackSource(item(type), "project", undefined, {}), null);
  }
});

test("each image appears only after its own decoding; videos do not wait for image downloads", () => {
  const image = item("image");
  const source = marketPlaybackSource(image, "project", licensed);
  assert.equal(readyMarketPlaybackSource(image, "project", licensed, {}), null);
  assert.equal(readyMarketPlaybackSource(image, "project", licensed, { [source]: "blob:decoded" }), "blob:decoded");
  assert.equal(readyMarketPlaybackSource(item("video"), "project", licensed, {}), source);
  assert.equal(readyMarketPlaybackSource(item("audio"), "project", licensed, {}), source);
  const unlicensed = { ...licensed, licensed: false };
  assert.equal(readyMarketPlaybackSource(image, "project", unlicensed, { [source]: "blob:decoded" }), null);
  assert.equal(readyMarketPlaybackSource(image, "project", unlicensed, { "/watermarked": "blob:preview" }), "blob:preview");
});

test("ordinary project media stays visible without marketplace readiness", () => {
  const ordinary = { ...item("image"), metadata: {} };
  assert.equal(readyMarketPlaybackSource(ordinary, "project", undefined, {}), ordinary.details.src);
});
