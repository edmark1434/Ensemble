import assert from "node:assert/strict";
import { test } from "node:test";
import type { ITrackItem } from "@designcombo/types";
import { collectMarketExportAssetIds } from "./market-export-assets";

const asset = (id: string, hidden = false) => ({ type: "image", details: { hidden }, metadata: { market: true, market_asset_id: id } }) as unknown as ITrackItem;
test("export scopes follow visible IDs, include scene media, and deduplicate bundles", () => {
  const inner = { trackItemIds: ["one", "two"], trackItemsMap: { one: asset("bundle"), two: asset("bundle"), stale: asset("removed") } };
  const root = { trackItemIds: ["scene", "outside", "hidden"], trackItemsMap: {
    scene: { type: "scene", details: { content: inner } } as unknown as ITrackItem,
    outside: asset("outside"), hidden: asset("hidden", true), orphan: asset("orphan"),
  } };
  assert.deepEqual(collectMarketExportAssetIds(root), ["bundle", "outside"]);
  assert.deepEqual(collectMarketExportAssetIds(inner), ["bundle"], "Scene exports exclude unrelated project assets");
  root.trackItemsMap.scene.details.hidden = true;
  assert.deepEqual(collectMarketExportAssetIds(root), ["outside"]);
});
