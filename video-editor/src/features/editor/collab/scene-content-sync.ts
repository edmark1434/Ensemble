import { CollabSchema, readStateFromDoc } from "./ydoc-schema";
import { isSceneItem, DEFAULT_SCENE_DURATION_MS, SceneRenderContent } from "../types/ensemble-scene";

export const DURATION_SYNC_INTERVAL_MS = 400;

// Pushes a scene's live content AND its derived duration into the project
// doc's own scene trackItem, in one transact. Content goes into
// details.content (opaque blob, same style as the rest of `details`);
// duration drives the same display.to cascade this always did. Because
// both land together, any viewer with the project open gets content
// updates through the exact same path (mirror-in -> stateManager -> props)
// that already delivers position/duration to every scene item — no
// separate content channel needed.
export function applySceneContentToDoc(
  projectSchema: CollabSchema,
  sceneItemId: string,
  newContent: SceneRenderContent,
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

  const track = snapshot.tracks.find((t) => t.items.includes(sceneItemId));
  const affectedIds =
    deltaMs !== 0 && track
      ? track.items.filter((id) => {
        if (id === sceneItemId) return true;
        const item = snapshot.trackItemsMap[id];
        return !!item && item.display.from >= oldTo;
      })
      : [];

  projectSchema.doc.transact(() => {
    const yItem = projectSchema.trackItems.get(sceneItemId);
    if (yItem) {
      yItem.set("details", { ...yItem.get("details"), content: newContent });
    }

    for (const id of affectedIds) {
      const yAffected = projectSchema.trackItems.get(id);
      if (!yAffected) continue;
      const display = yAffected.get("display");
      yAffected.set(
        "display",
        id === sceneItemId
          ? { ...display, to: newTo }
          : { from: display.from + deltaMs, to: display.to + deltaMs },
      );
    }

    if (deltaMs !== 0) {
      const newDuration = Math.max(projectSchema.meta.get("duration") ?? 0, newTo);
      if (projectSchema.meta.get("duration") !== newDuration) {
        projectSchema.meta.set("duration", newDuration);
      }
    }
  }, origin);

  return true;
}