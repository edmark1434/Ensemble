import assert from "node:assert/strict";
import { test } from "node:test";
import { copyTemplate, decodeTemplate, encodeTemplate } from "./template-copy";
import type { DocSnapshot } from "@/features/editor/collab/ydoc-schema";
import type { ITrackItem } from "@designcombo/types";

const empty = (): DocSnapshot => ({ trackItemsMap: {}, trackItemIds: [], tracks: [], markers: [],
  transitionsMap: {}, transitionIds: [], orphanTransitionIds: [], size: { width: 1280, height: 720 }, fps: 24, duration: 5000 });
const sceneItem = (id: string, blockId: string) => ({ id, type: "scene", details: { blockId } }) as unknown as ITrackItem;

test("template copies remap repeated and nested scenes without mutating source or losing market references", async () => {
  const root = empty();
  root.trackItemIds = ["one", "two"];
  root.trackItemsMap = { one: sceneItem("one", "source-scene"), two: sceneItem("two", "source-scene") };
  const scene = empty();
  scene.trackItemIds = ["nested"];
  scene.trackItemsMap = { nested: sceneItem("nested", "nested-scene") };
  const nested = empty();
  nested.trackItemIds = ["paid"];
  nested.trackItemsMap = { paid: { id: "paid", type: "image", details: { src: "signed-original" },
    metadata: { market: true, market_asset_id: "asset", media_asset_id: "media" } } as unknown as ITrackItem };
  const before = structuredClone({ root, scene, nested });
  let reads = 0;
  const result = await copyTemplate(root, "My template", async id => { reads++; return id === "source-scene" ? scene : nested; },
    async item => { item.details.src = "public-proxy"; });
  assert.equal(reads, 2);
  assert.equal(result.scenes.length, 2);
  assert.equal(result.durationSeconds, 5);
  const copy = decodeTemplate(Buffer.from(result.document, "base64"));
  const first = copy.trackItemsMap.one.details as unknown as { blockId: string; content: DocSnapshot };
  const second = copy.trackItemsMap.two.details as unknown as { blockId: string };
  assert.equal(first.blockId, second.blockId);
  assert.notEqual(first.blockId, "source-scene");
  const child = first.content.trackItemsMap.nested.details as unknown as { blockId: string; content: DocSnapshot };
  assert.notEqual(child.blockId, "nested-scene");
  assert.equal(child.content.trackItemsMap.paid.details.src, "public-proxy");
  assert.deepEqual(child.content.trackItemsMap.paid.metadata, nested.trackItemsMap.paid.metadata);
  assert.deepEqual({ root, scene, nested }, before);
  assert.equal(copy.projectName, "My template");
});

test("missing and cyclic scenes fail instead of producing broken projects", async () => {
  const root = empty(); root.trackItemIds = ["scene"]; root.trackItemsMap = { scene: sceneItem("scene", "cycle") };
  await assert.rejects(copyTemplate(root, "Missing", async () => null, async () => {}), /missing/);
  await assert.rejects(copyTemplate(root, "Cycle", async () => root, async () => {}), /Invalid template scene/);
});

test("fresh documents preserve canvas settings and omit unused timeline content", async () => {
  const root = empty(); root.trackItemsMap = { unused: sceneItem("unused", "unreferenced") };
  const result = await copyTemplate(root, "Copy", async () => { throw new Error("unused scene must not load"); }, async () => {});
  const copy = decodeTemplate(Buffer.from(result.document, "base64"));
  assert.deepEqual(copy.trackItemsMap, {});
  assert.deepEqual(copy.size, root.size);
  assert.equal(copy.fps, 24);
  assert.equal(decodeTemplate(Buffer.from(encodeTemplate(copy, "Again"), "base64")).projectName, "Again");
});
