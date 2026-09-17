import { CollabSchema, readStateFromDoc } from "./ydoc-schema";
import {isSceneItem, DEFAULT_SCENE_DURATION_MS, SceneRenderContent, ISceneDetails} from "../types/ensemble-scene";

export const DURATION_SYNC_INTERVAL_MS = 400;

// Same technique as LayoutMediaControls' commitDimension: scenes are
// scale-locked, so details.width/height are an immutable base size set
// once at creation, and apparent on-screen size is always base *
// |scale| via details.transform. The renderer scales around the box's
// own center, so writing to width/height directly drags the center —
// that's what was moving the item. Fix: only ever touch transform here,
// and compensate left/top by half the resulting size delta so the
// VISIBLE top-left corner stays put (cancelling the shift, not causing
// one).
function getScaleXY(transform?: string): [number, number] {
  const match = (transform || "").match(/scale\(\s*([-\d.]+)\s*,\s*([-\d.]+)/);
  return match ? [parseFloat(match[1]), parseFloat(match[2])] : [1, 1];
}

function parseNumeric(v: number | string | undefined): number {
  if (typeof v === "number") return v;
  const parsed = parseFloat(v ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

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

  const details = sceneItem.details as ISceneDetails;
  const newSize = newContent.size;
  const oldSize = details.content?.size;

  let transformPatch: string | undefined;
  let leftPatch: number | undefined;
  let topPatch: number | undefined;

  if (
    newSize && newSize.width > 0 && newSize.height > 0 &&
    oldSize && oldSize.width > 0 && oldSize.height > 0 &&
    (newSize.width !== oldSize.width || newSize.height !== oldSize.height)
  ) {
    const baseW = details.width ?? 0;
    const baseH = details.height ?? 0;
    const [curSx, curSy] = getScaleXY(details.transform);

    const curDisplayW = baseW * Math.abs(curSx);
    const curDisplayH = baseH * Math.abs(curSy);

    const nextDisplayW = curDisplayW * (newSize.width / oldSize.width);
    const nextDisplayH = curDisplayH * (newSize.height / oldSize.height);

    const signX = curSx < 0 ? -1 : 1;
    const signY = curSy < 0 ? -1 : 1;

    const nextSx = baseW > 0 ? signX * (nextDisplayW / baseW) : curSx;
    const nextSy = baseH > 0 ? signY * (nextDisplayH / baseH) : curSy;

    const deltaW = nextDisplayW - curDisplayW;
    const deltaH = nextDisplayH - curDisplayH;

    transformPatch = `scale(${nextSx}, ${nextSy})`;
    leftPatch = parseNumeric(details.left) + deltaW / 2;
    topPatch = parseNumeric(details.top) + deltaH / 2;
  }

  projectSchema.doc.transact(() => {
    const yItem = projectSchema.trackItems.get(sceneItemId);
    if (yItem) {
      const patch: Partial<ISceneDetails> = { content: newContent };
      if (transformPatch !== undefined) {
        patch.transform = transformPatch;
        patch.left = leftPatch;
        patch.top = topPatch;
      }
      yItem.set("details", { ...yItem.get("details"), ...patch });
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

// Generic patch into a scene trackItem's `details` map for editable
// metadata that isn't part of the live-pushed render content (see
// applySceneContentToDoc above) — e.g. the display name shown on the
// scene item itself, edited from basic-scene-item while browsing the
// project from outside the scene. Shallow-merges into whatever
// `details` already holds, same as applySceneContentToDoc's `content`
// merge.
export function applySceneDetailsPatch(
  projectSchema: CollabSchema,
  sceneItemId: string,
  patch: Partial<ISceneDetails>,
  origin: unknown,
): boolean {
  const yItem = projectSchema.trackItems.get(sceneItemId);
  if (!yItem || !isSceneItem(yItem.get("type"))) return false;

  projectSchema.doc.transact(() => {
    yItem.set("details", { ...yItem.get("details"), ...patch });
  }, origin);

  return true;
}