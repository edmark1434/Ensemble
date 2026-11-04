import * as Y from "yjs";
import { createCollabSchema, readStateFromDoc, type DocSnapshot } from "@/features/editor/collab/ydoc-schema";
import { readPreviewSnapshot, readSceneAtSnapshot } from "@/lib/db/snapshot-preview";
import { getProjectMarketLicenses } from "@/lib/market-license-service";
import { missingUploadSources } from "@/lib/db/upload-usage";
import { mediaSources } from "@/features/editor/utils/media-sources";
import type { ITrackItem } from "@designcombo/types";
import type { ISceneDetails, SceneRenderContent } from "@/features/editor/types/ensemble-scene";

function decode(document: Uint8Array): DocSnapshot {
  const doc = new Y.Doc();
  const schema = createCollabSchema(doc);
  try {
    Y.applyUpdate(doc, document);
    // Yjs can retain frozen nested JSON values. Hydration and media signing
    // need an independent, mutable copy of every item and its details.
    return structuredClone(readStateFromDoc(schema));
  } finally { schema.awareness.destroy(); doc.destroy(); }
}

export async function loadSnapshotPreview(snapshotId: number, userId: string) {
  const saved = await readPreviewSnapshot(snapshotId, userId);
  if (!saved) return null;
  const snapshot = decode(saved.document);
  const scenes: Record<string, DocSnapshot> = {};
  const media: ITrackItem[] = [];
  const sceneCache = new Map<string, Promise<DocSnapshot | null>>();
  async function hydrate(content: Pick<DocSnapshot, "trackItemIds" | "trackItemsMap">, seen = new Set<string>()) {
    for (const id of content.trackItemIds) {
      const item = content.trackItemsMap[id];
      if (!item) continue;
      if (String(item.type) !== "scene") { media.push(item); continue; }
      const details = item.details as unknown as ISceneDetails;
      const blockId = details.blockId;
      if (!/^[0-9a-f-]{36}$/i.test(blockId || "") || seen.has(blockId) || seen.size > 10) continue;
      if (!sceneCache.has(blockId)) sceneCache.set(blockId, readSceneAtSnapshot(blockId, saved.project_id, saved.created_at)
        .then(row => row ? decode(row.document) : null));
      const scene = await sceneCache.get(blockId);
      if (scene) {
        // Resolve against the capture time, never the scene's live/latest document.
        details.content = structuredClone({ trackItemsMap: scene.trackItemsMap, trackItemIds: scene.trackItemIds,
          transitionsMap: scene.transitionsMap, size: scene.size, background: scene.background }) as SceneRenderContent;
      }
      if (details.content) await hydrate(details.content, new Set([...seen, blockId]));
      if (scene && details.content) scenes[blockId] = { ...scene, ...details.content };
    }
  }
  await hydrate(snapshot);
  const assetIds = [...new Set(media.flatMap(item => {
    const metadata = item.metadata as { market?: boolean; market_asset_id?: string } | undefined;
    return metadata?.market && metadata.market_asset_id ? [metadata.market_asset_id] : [];
  }))];
  const licenses = assetIds.length ? await getProjectMarketLicenses(saved.project_id, userId, assetIds) : null;
  const missing = new Set(await missingUploadSources(mediaSources(snapshot)));
  for (const item of media) {
    const metadata = item.metadata as { market?: boolean; market_asset_id?: string; media_asset_id?: string } | undefined;
    if (!metadata?.market || !metadata.market_asset_id) continue;
    const license = licenses?.assets.find(asset => asset.assetId === metadata.market_asset_id);
    if (license?.licensed) {
      const source = license.playbackSources?.[metadata.media_asset_id || ""];
      if (source) item.details.src = source.url;
      else missing.add(item.details.src);
    }
    // This is a detached playback copy: retain watermarked previews for unlicensed
    // media, and use the authorized signed source for licensed media. No project
    // store/license subscription or URL is written back to the saved snapshot.
    item.metadata = { ...item.metadata, market: false };
  }
  return { snapshot, scenes, missingSources: [...missing], name: snapshot.projectName || saved.name };
}
