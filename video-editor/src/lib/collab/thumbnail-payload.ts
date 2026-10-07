import * as Y from "yjs";
import { createHash } from "node:crypto";
import type { ITrackItem } from "@designcombo/types";
import {
  createCollabSchema,
  readStateFromDoc,
} from "@/features/editor/collab/ydoc-schema";
import { loadLatestProjectState } from "@/lib/collab/persistence-store";

export const THUMBNAIL_SHORT_SIDE_PX = 480;

function isVisualItem(item: ITrackItem): boolean {
  if (item.type === "audio") return false;
  if ((item.details as any)?.hidden) return false;
  return true;
}

export function pickThumbnailTimeMs(
  trackItemsMap: Record<string, ITrackItem>,
  durationMs: number,
): number | null {
  let earliest: ITrackItem | null = null;

  for (const item of Object.values(trackItemsMap)) {
    if (!isVisualItem(item)) continue;
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
    const duration = snap.duration ?? 0;
    const background = snap.background ?? { type: "color", value: "#000000" };

    const timeMs = pickThumbnailTimeMs(snap.trackItemsMap, duration);
    if (timeMs === null) return null;

    const visibleIds = snap.trackItemIds.filter((id) => {
      const item = snap.trackItemsMap[id];
      return (
        !!item &&
        isVisualItem(item) &&
        item.display.from <= timeMs &&
        timeMs < item.display.to
      );
    });

    const hash = createHash("sha1")
      .update(
        stableStringify({
          timeMs,
          size: snap.size,
          background,
          order: visibleIds,
          items: visibleIds.map((id) => snap.trackItemsMap[id]),
        }),
      )
      .digest("hex");

    const payload = {
      id: `thumb-${projectId}`,
      trackItemsMap: snap.trackItemsMap,
      trackItemIds: snap.trackItemIds,
      transitionsMap: snap.transitionsMap,
      transitionIds: snap.transitionIds,
      tracks: snap.tracks,
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

    return { payload, hash, timeMs };
  } finally {
    // createCollabSchema starts an awareness interval, so don't leak it
    schema.awareness.destroy();
    doc.destroy();
  }
}