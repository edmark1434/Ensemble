import { CollabSchema, readStateFromDoc } from "./ydoc-schema";
import { isSceneItem, DEFAULT_SCENE_DURATION_MS } from "../types/ensemble-scene";

export const DURATION_SYNC_INTERVAL_MS = 400;

export function applySceneContentDurationToDoc(
  projectSchema: CollabSchema,
  sceneItemId: string,
  newContentDurationMs: number,
  origin: unknown,
): boolean {
  const snapshot = readStateFromDoc(projectSchema);
  const sceneItem = snapshot.trackItemsMap[sceneItemId];
  if (!sceneItem || !isSceneItem(sceneItem.type)) return false;

  const effectiveMs = newContentDurationMs > 0 ? newContentDurationMs : DEFAULT_SCENE_DURATION_MS;
  const oldTo = sceneItem.display.to;
  const newTo = sceneItem.display.from + effectiveMs;
  const deltaMs = newTo - oldTo;
  if (deltaMs === 0) return false;

  const track = snapshot.tracks.find((t) => t.items.includes(sceneItemId));
  if (!track) return false;

  const affectedIds = track.items.filter((id) => {
    if (id === sceneItemId) return true;
    const item = snapshot.trackItemsMap[id];
    return !!item && item.display.from >= oldTo;
  });

  projectSchema.doc.transact(() => {
    for (const id of affectedIds) {
      const yItem = projectSchema.trackItems.get(id);
      if (!yItem) continue;
      const display = yItem.get("display");
      yItem.set(
        "display",
        id === sceneItemId
          ? { ...display, to: newTo }
          : { from: display.from + deltaMs, to: display.to + deltaMs },
      );
    }
    const newDuration = Math.max(projectSchema.meta.get("duration") ?? 0, newTo);
    if (projectSchema.meta.get("duration") !== newDuration) {
      projectSchema.meta.set("duration", newDuration);
    }
  }, origin);

  return true;
}