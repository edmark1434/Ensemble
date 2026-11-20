import * as Y from "yjs";
import { createCollabSchema, readStateFromDoc, type DocSnapshot } from "@/features/editor/collab/ydoc-schema";
import { readPreviewSnapshot, readSceneAtSnapshot } from "@/lib/db/snapshot-preview";
import { getProjectMarketLicenses } from "@/lib/market-license-service";
import { missingUploadSources } from "@/lib/db/upload-usage";
import { mediaSourceKey, mediaSources } from "@/features/editor/utils/media-sources";
import type { ITrackItem } from "@designcombo/types";
import type { ISceneDetails, SceneRenderContent } from "@/features/editor/types/ensemble-scene";
import { readPublishedMarketTemplate, readTemplateMarketMedia, readTemplateUpload } from "@/lib/db/template-copy";
import { buildPublicUrl } from "@/lib/s3";
import { isGeneratedMarketProxy } from "@/lib/market-proxy";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { loadLatestProjectState } from "./persistence-store";
import { loadLatestBlockState } from "./block-persistence-store";
import { liveRooms } from "./live-rooms";
import { readProjectOwnerName } from "@/lib/db/project-members";

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

type SceneDocumentReader = (blockId: string) => Promise<Uint8Array | null>;

async function hydrateSnapshot(saved: { document: Uint8Array }, readSceneDocument: SceneDocumentReader) {
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
      if (!sceneCache.has(blockId)) sceneCache.set(blockId, readSceneDocument(blockId).then(document => document ? decode(document) : null));
      const scene = await sceneCache.get(blockId);
      if (scene) {
        // Copy each instance so nested media resolution cannot mutate a sibling scene.
        details.content = structuredClone({ trackItemsMap: scene.trackItemsMap, trackItemIds: scene.trackItemIds,
          transitionsMap: scene.transitionsMap, size: scene.size, background: scene.background }) as SceneRenderContent;
      }
      if (details.content) await hydrate(details.content, new Set([...seen, blockId]));
      if (scene && details.content) scenes[blockId] = { ...scene, ...details.content };
    }
  }
  await hydrate(snapshot);
  return { snapshot, scenes, media };
}

export async function loadSnapshotPreview(snapshotId: number, userId: string) {
  const saved = await readPreviewSnapshot(snapshotId, userId);
  if (!saved) return null;
  const [{ snapshot, scenes, media }, ownerName] = await Promise.all([
    hydrateSnapshot(saved, async id => (await readSceneAtSnapshot(id, saved.project_id, snapshotId))?.document ?? null),
    readProjectOwnerName(saved.project_id),
  ]);
  const prepared = await preparePrivatePreview(snapshot, scenes, media, saved.project_id, userId, saved.name);
  return { ...prepared, ownerName: ownerName ?? undefined };
}

// Read-only playback of a save. Access is checked by the caller.
export async function loadProjectSavePreview(save: { document: Uint8Array; project_id: string; created_at: Date; name: string },
  readScene: SceneDocumentReader, userId: string) {
  const { snapshot, scenes, media } = await hydrateSnapshot(save, readScene);
  const prepared = await preparePrivatePreview(snapshot, scenes, media, save.project_id, userId, save.name);
  return { ...prepared, savedAt: save.created_at.toISOString() };
}

async function preparePrivatePreview(snapshot: DocSnapshot, scenes: Record<string, DocSnapshot>, media: ITrackItem[],
  projectId: string, userId: string, name: string) {
  const assetIds = [...new Set(media.flatMap(item => {
    const metadata = item.metadata as { market?: boolean; market_asset_id?: string } | undefined;
    return metadata?.market && metadata.market_asset_id ? [metadata.market_asset_id] : [];
  }))];
  const licenses = assetIds.length ? await getProjectMarketLicenses(projectId, userId, assetIds) : null;
  const missing = new Set(await missingUploadSources(mediaSources(snapshot), projectId, userId));
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
  return { snapshot, scenes, missingSources: [...missing], name: snapshot.projectName || name };
}

async function currentDocument(kind: "project" | "block", id: string) {
  const live = await liveRooms.get(`${kind}:${id}`);
  if (live) return Y.encodeStateAsUpdate(live.doc);
  const { snapshot, updates } = await (kind === "project" ? loadLatestProjectState(id) : loadLatestBlockState(id));
  const parts = snapshot ? [snapshot, ...updates] : updates;
  return parts.length ? Y.mergeUpdates(parts) : null;
}

// Called only after the main site's portfolio access and contract check.
export async function loadPortfolioComposition(projectId: string) {
  const document = await currentDocument("project", projectId);
  if (!document) return null;
  const blocks = await db.selectFrom("blocks").select("block_id").where("project_id", "=", projectId)
    .where("deleted_at", "is", null).execute();
  const allowed = new Set(blocks.map(block => block.block_id));
  const content = await hydrateSnapshot({ document }, async blockId => {
    if (!allowed.has(blockId)) return null;
    return currentDocument("block", blockId);
  });
  const version = createHash("sha256").update(JSON.stringify(content.snapshot)).digest("hex");
  const duration = content.snapshot.trackItemIds.reduce((end, id) =>
    Math.max(end, content.snapshot.trackItemsMap[id]?.display.to || 0), content.snapshot.duration || 0);
  return { ...content, version, duration };
}

export async function portfolioPlayback(content: NonNullable<Awaited<ReturnType<typeof loadPortfolioComposition>>>,
  projectId: string, userId: string, name: string) {
  const [prepared, ownerName] = await Promise.all([
    preparePrivatePreview(content.snapshot, content.scenes, content.media, projectId, userId, name),
    readProjectOwnerName(projectId),
  ]);
  return { ...prepared, ownerName: ownerName ?? undefined };
}

function emptyProjectSnapshot(name: string, width: number, height: number): DocSnapshot {
  const doc = new Y.Doc();
  const schema = createCollabSchema(doc);
  try {
    const snapshot = structuredClone(readStateFromDoc(schema));
    snapshot.size = { width, height };
    snapshot.projectName = name;
    return snapshot;
  } finally { schema.awareness.destroy(); doc.destroy(); }
}

// Read-only guest playback for a verified Viewer share link.
// Caller must verify the share link and confirm the issuer is still active.
export async function loadGuestProjectSharePreview(
  projectId: string,
  issuerUserId: string,
  project: { name: string; width: number; height: number; ownerName: string | null },
) {
  const composition = await loadPortfolioComposition(projectId);
  if (!composition) {
    return {
      snapshot: emptyProjectSnapshot(project.name, project.width, project.height),
      scenes: {},
      missingSources: [],
      name: project.name,
      ownerName: project.ownerName ?? undefined,
    };
  }
  const prepared = await preparePrivatePreview(
    composition.snapshot,
    composition.scenes,
    composition.media,
    projectId,
    issuerUserId,
    project.name,
  );
  prepared.snapshot.size ??= { width: project.width, height: project.height };
  return { ...prepared, ownerName: project.ownerName ?? undefined };
}

export async function loadMarketTemplatePreview(assetId: string, snapshotId?: number) {
  const source = await readPublishedMarketTemplate(assetId);
  // UUID links follow the current listing; legacy tokens stay bound to their snapshot.
  if (!source || (snapshotId !== undefined && Number(source.snapshot_id) !== snapshotId)) return null;
  const { snapshot, scenes, media } = await hydrateSnapshot(source, async id => source.project_id
    ? (await readSceneAtSnapshot(id, source.project_id, source.snapshot_id))?.document ?? null : null);
  const missing = new Set<string>();
  const marketCache = new Map<string, ReturnType<typeof readTemplateMarketMedia>>();
  const uploadCache = new Map<string, ReturnType<typeof readTemplateUpload>>();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const markMissing = (item: ITrackItem) => {
    // Never send a stale protected source to a public preview, even for a missing item.
    item.details.src = `missing-template-media:${item.id}`;
    missing.add(item.details.src);
  };
  for (const item of media) {
    const metadata = item.metadata as { market?: boolean; market_asset_id?: string; media_asset_id?: string } | undefined;
    if (metadata?.market) {
      const marketId = metadata.market_asset_id || "";
      const mediaId = metadata.media_asset_id || "";
      let preview;
      if (uuid.test(marketId) && uuid.test(mediaId)) {
        const key = `${marketId}:${mediaId}`;
        if (!marketCache.has(key)) marketCache.set(key, readTemplateMarketMedia(marketId, mediaId));
        preview = await marketCache.get(key);
      }
      if (preview && isGeneratedMarketProxy(preview.type, preview.original_file_id, preview.proxy_file_id, preview.path, preview.mime_type)) {
        item.details.src = buildPublicUrl(preview.path);
      } else markMissing(item);
      item.metadata = { ...item.metadata, market: false };
      continue;
    }
    if (!["image", "video", "audio"].includes(String(item.type)) || !item.details.src) continue;
    const path = mediaSourceKey(item.details.src);
    if (path.startsWith("asset-originals/") || path.startsWith("api/market-assets/")) {
      markMissing(item);
    } else if (path.startsWith("uploads/")) {
      if (!source.project_id) { markMissing(item); continue; }
      if (!uploadCache.has(path)) uploadCache.set(path, readTemplateUpload(path, source.project_id));
      const upload = await uploadCache.get(path);
      if (upload) item.details.src = buildPublicUrl(upload.path);
      else markMissing(item);
    }
  }
  const ownerName = source.is_admin_asset || source.owner_type === "Staff"
    ? "Ensemble"
    : source.owner_name?.trim() || (source.project_id ? await readProjectOwnerName(source.project_id) : null) || undefined;
  return { snapshot, scenes, missingSources: [...missing], name: source.name, ownerName };
}
