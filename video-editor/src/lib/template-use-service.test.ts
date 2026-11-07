import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import * as copy from "./collab/template-copy";
import { isGeneratedMarketProxy } from "./market-proxy";
import { mediaSourceKey } from "@/features/editor/utils/media-sources";
import type { DocSnapshot } from "@/features/editor/collab/ydoc-schema";
import type { ITrackItem } from "@designcombo/types";

const assetId = randomUUID();
const mediaId = randomUUID();
function prepareWith(items: ITrackItem[], price = 100, proxyPath = "assets/proxies/test.webp") {
  const state: DocSnapshot = { trackItemIds: items.map(item => item.id), trackItemsMap: Object.fromEntries(items.map(item => [item.id, item])),
    transitionsMap: {}, transitionIds: [], tracks: [], markers: [], orphanTransitionIds: [] };
  const exports = {} as { prepareTemplateCopy: (id: number, name: string) => Promise<Awaited<ReturnType<typeof copy.copyTemplate>> & {
    hasPaidAssets: boolean; uploads: { sourceId: string; id: string }[] }> };
  const compiled = ts.transpileModule(readFileSync("src/lib/template-use-service.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  // Keep test data in the same realm: Yjs intentionally checks Object constructors.
  const run = vm.runInThisContext(`(function(exports, require) { ${compiled}\n})`);
  run(exports, (name: string) => {
    if (name === "node:crypto") return { randomUUID };
    if (name === "@/lib/db/template-copy") return {
      readTemplateSource: async () => ({ document: Buffer.from(copy.encodeTemplate(state, "Source"), "base64"), project_id: "source", created_at: new Date() }),
      readTemplateMarketMedia: async () => ({ price_credits: price, path: proxyPath, original_file_id: "original", proxy_file_id: "proxy", type: "image", mime_type: "image/webp" }),
      readTemplateUpload: async () => ({ media_asset_id: mediaId, path: "uploads/source/photo.png" }),
    };
    if (name === "@/lib/db/snapshot-preview") return { readSceneAtSnapshot: async () => null };
    if (name === "@/lib/collab/template-copy") return copy;
    if (name === "@/lib/s3") return { buildPublicUrl: (path: string) => `https://cdn.example/${path}` };
    if (name === "@/lib/market-proxy") return { isGeneratedMarketProxy };
    if (name === "@/features/editor/utils/media-sources") return { mediaSourceKey };
    throw new Error(name);
  });
  return exports.prepareTemplateCopy(1, "Copy");
}
const item = (market: boolean, src: string) => ({ id: "media", type: "image", details: { src },
  metadata: market ? { market: true, market_asset_id: assetId, media_asset_id: mediaId } : {} }) as unknown as ITrackItem;

test("paid media shows the tip and copies public previews without source licenses or signed URLs", async () => {
  const result = await prepareWith([item(true, "https://cdn.example/asset-originals/private?Signature=source")]);
  assert.equal(result.hasPaidAssets, true);
  const copied = copy.decodeTemplate(Buffer.from(result.document, "base64")).trackItemsMap.media;
  assert.equal(copied.details.src, "https://cdn.example/assets/proxies/test.webp");
  assert.equal((copied.metadata as { market_asset_id: string }).market_asset_id, assetId);
  assert.equal((await prepareWith([item(true, "source")], 0)).hasPaidAssets, false);
  await assert.rejects(prepareWith([item(true, "source")], 100, "asset-originals/private"), /preview is unavailable/);
});

test("included uploads get separate media identities and stripped transient URL queries", async () => {
  const result = await prepareWith([item(false, "https://cdn.example/uploads/source/photo.png?temporary=1")]);
  assert.equal(result.hasPaidAssets, false);
  assert.equal(result.uploads.length, 1);
  assert.equal(result.uploads[0].sourceId, mediaId);
  assert.notEqual(result.uploads[0].id, mediaId);
  const copied = copy.decodeTemplate(Buffer.from(result.document, "base64")).trackItemsMap.media;
  assert.equal(copied.details.src, "https://cdn.example/uploads/source/photo.png");
  assert.equal((copied.metadata as { media_asset_id: string }).media_asset_id, result.uploads[0].id);
  const missing = await prepareWith([item(false, "https://cdn.example/asset-originals/private")]);
  const missingItem = copy.decodeTemplate(Buffer.from(missing.document, "base64")).trackItemsMap.media;
  assert.equal(missingItem.details.src, "missing-template-media:media");
  assert.equal(missing.uploads.length, 0);
});
