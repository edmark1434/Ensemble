import * as Y from "yjs";
import { createHash } from "node:crypto";
import type { ITrackItem } from "@designcombo/types";
import {
  createCollabSchema,
  readStateFromDoc,
} from "@/features/editor/collab/ydoc-schema";
import { mediaSources } from "@/features/editor/utils/media-sources";
import { loadLatestProjectState } from "@/lib/collab/persistence-store";
import { missingUploadSources } from "@/lib/db/upload-usage";
import {
  filterRenderMedia,
  sanitizeRenderTransitions,
} from "@/lib/filter-render-media";

export const THUMBNAIL_SHORT_SIDE_PX = 480;

function isValidRemoteMediaSrc(src: unknown): src is string {
  return typeof src === "string" && /^https?:\/\//i.test(src);
}

function isVisualItem(
  item: ITrackItem,
  missing: ReadonlySet<string> = new Set(),
): boolean {
  if (item.type === "audio") return false;
  if ((item.details as any)?.hidden) return false;
  if (!(item.display?.to > item.display?.from)) return false;
  const src = (item.details as any)?.src;
  if (item.type === "image" || item.type === "video") {
    if (!isValidRemoteMediaSrc(src) || missing.has(src)) return false;
  } else if (typeof src === "string" && src.startsWith("pending-upload:")) {
    return false;
  }
  return true;
}

export function pickThumbnailTimeMs(
  trackItemsMap: Record<string, ITrackItem>,
  durationMs: number,
  trackItemIds?: string[],
  missing: ReadonlySet<string> = new Set(),
): number | null {
  let earliest: ITrackItem | null = null;
  const candidates = trackItemIds
    ? trackItemIds.map((id) => trackItemsMap[id]).filter(Boolean)
    : Object.values(trackItemsMap);

  for (const item of candidates) {
    if (!isVisualItem(item, missing)) continue;
    if (!earliest || item.display.from < earliest.display.from) {
      earliest = item;
    }
  }

  if (!earliest) return null;

  const length = earliest.display.to - earliest.display.from;
  const t = earliest.display.from + Math.min(1000, length / 2);

  return Math.max(0, Math.min(t, Math.max(0, durationMs - 1)));
}

// Key order out of Y.Map#toJSON can differ between doc instances, so the
// hash can't rely on plain JSON.stringify.
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const body = Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(",");
    return `{${body}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export interface ThumbnailJob {
  payload: Record<string, unknown>;
  hash: string;
  timeMs: number;
}

// finalUpdate: the live room doc's state, when the caller has it (room just
// emptied). Applied on top of what's in Postgres, same idea as compactProject's
// extraUpdate. Yjs updates are idempotent so overlap is harmless.
export async function buildThumbnailJob(
  projectId: string,
  finalUpdate?: Uint8Array,
): Promise<ThumbnailJob | null> {
  const persisted = await loadLatestProjectState(projectId);

  const doc = new Y.Doc({ gc: false });
  const schema = createCollabSchema(doc);

  try {
    if (persisted.snapshot) Y.applyUpdate(doc, persisted.snapshot);
    for (const update of persisted.updates) Y.applyUpdate(doc, update);
    if (finalUpdate) Y.applyUpdate(doc, finalUpdate);

    const snap = readStateFromDoc(schema);
    if (!snap.size) return null;

    const fps = snap.fps ?? 30;
    const duration = snap.trackItemIds.reduce(
      (end, id) => Math.max(end, snap.trackItemsMap[id]?.display.to || 0),
      snap.duration || 0,
    );
    if (duration <= 0) return null;
    const background = snap.background ?? { type: "color", value: "#000000" };
    const missing = new Set(
      await missingUploadSources(mediaSources(snap), projectId),
    );

    const timeMs = pickThumbnailTimeMs(
      snap.trackItemsMap,
      duration,
      snap.trackItemIds,
      missing,
    );
    if (timeMs === null) return null;

    const visibleIds = snap.trackItemIds.filter((id) => {
      const item = snap.trackItemsMap[id];
      return (
        !!item &&
        isVisualItem(item, missing) &&
        item.display.from <= timeMs &&
        timeMs < item.display.to
      );
    });
    if (!visibleIds.length) return null;

    // Keep only items visible at timeMs (plus any real transition neighbor whose
    // transition overlaps timeMs) so off-frame GIFs/videos never stall Lambda.
    const includedIds = new Set(visibleIds);
    for (const transition of Object.values(snap.transitionsMap)) {
      if (!transition || transition.kind === "none") continue;
      const fromItem = snap.trackItemsMap[transition.fromId];
      const toItem = snap.trackItemsMap[transition.toId];
      if (
        !fromItem ||
        !toItem ||
        !isVisualItem(fromItem, missing) ||
        !isVisualItem(toItem, missing)
      ) {
        continue;
      }
      const half = (transition.duration ?? 0) / 2;
      const seam = fromItem.display.to;
      if (timeMs >= seam - half && timeMs <= seam + half) {
        includedIds.add(fromItem.id);
        includedIds.add(toItem.id);
      }
    }

    const filteredTrackItemIds = snap.trackItemIds.filter((id) => includedIds.has(id));
    const filteredTrackItemsMap = structuredClone(
      Object.fromEntries(
        filteredTrackItemIds.map((id) => [id, snap.trackItemsMap[id]]),
      ),
    );
    const filteredTracks = snap.tracks
      .map((track) => ({
        ...track,
        items: track.items.filter((id) => includedIds.has(id)),
      }))
      .filter((track) => track.items.length > 0);
    const filteredTransitionsMap = structuredClone(
      Object.fromEntries(
        Object.entries(snap.transitionsMap).filter(
          ([, t]) => t && t.kind !== "none" && includedIds.has(t.fromId) && includedIds.has(t.toId),
        ),
      ),
    );
    const filteredTransitionIds = snap.transitionIds.filter(
      (id) => !!filteredTransitionsMap[id],
    );

    const payload = {
      id: `thumb-${projectId}`,
      trackItemsMap: filteredTrackItemsMap,
      trackItemIds: filteredTrackItemIds,
      transitionsMap: filteredTransitionsMap,
      transitionIds: filteredTransitionIds,
      tracks: filteredTracks,
      size: snap.size,
      fps,
      duration,
      background,
      projectName: "thumbnail",
      type: "image",
      format: "jpeg",
      resolution: THUMBNAIL_SHORT_SIDE_PX,
      bitrate: null,
      currentTime: timeMs,
    };

    filterRenderMedia(
      payload,
      (item) =>
        item.type === "audio" ||
        !!(item.details as any)?.hidden ||
        !isValidRemoteMediaSrc((item.details as any)?.src) ||
        missing.has((item.details as any).src),
    );
    sanitizeRenderTransitions(payload);
    if (!payload.trackItemIds.length) return null;

    const remainingVisibleIds = visibleIds.filter(
      (id) => id in payload.trackItemsMap,
    );
    const hash = createHash("sha1")
      .update(
        stableStringify({
          renderVersion: 2, // Media fills the resized layer in the render composition.
          timeMs,
          size: snap.size,
          background,
          order: remainingVisibleIds,
          items: remainingVisibleIds.map((id) => payload.trackItemsMap[id]),
        }),
      )
      .digest("hex");

    return { payload, hash, timeMs };
  } finally {
    // createCollabSchema starts an awareness interval, so don't leak it
    schema.awareness.destroy();
    doc.destroy();
  }
}
