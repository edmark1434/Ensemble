import * as Y from "yjs";
import type { CollabTarget } from "@/features/editor/collab/collab-target";
import { canResizeComposition } from "@/lib/composition-size-plan";
import { readUploadPlan } from "@/lib/db/upload-policy";
import { readCompositionSize } from "@/lib/db/composition-size";
import { loadLatestProjectState } from "./persistence-store";
import { loadLatestBlockState } from "./block-persistence-store";
import { liveRooms } from "./live-rooms";

type Size = { width?: number; height?: number };
const sameSize = (a: Size | undefined, b: Size | undefined) =>
  a?.width === b?.width && a?.height === b?.height;

export async function canPatchCompositionSize(
  userId: string,
  target: CollabTarget,
  patch: Size,
): Promise<boolean> {
  if (patch.width === undefined && patch.height === undefined) return true;
  const current = await readCompositionSize(target);
  const next = {
    width: patch.width ?? current.width,
    height: patch.height ?? current.height,
  };
  // Automatic metadata reconciliation sends dimensions even when unchanged.
  if (sameSize(current, next)) return true;
  return canResizeComposition(await readUploadPlan(userId));
}

// Inspect the merged result in an isolated document before accepting an update.
// Both HTTP persistence and live sync use this so autosave cannot bypass the UI.
export async function canApplyCompositionUpdate(
  userId: string,
  target: CollabTarget,
  update: Uint8Array,
  liveDoc?: Y.Doc,
): Promise<boolean> {
  const doc = new Y.Doc({ gc: false });
  try {
    const room = liveDoc ? undefined : await liveRooms.get(`${target.kind}:${target.id}`);
    const source = liveDoc ?? room?.doc;
    if (source) {
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(source));
    } else {
      const state = target.kind === "project"
        ? await loadLatestProjectState(target.id)
        : await loadLatestBlockState(target.id);
      if (state.snapshot) Y.applyUpdate(doc, state.snapshot);
      for (const existing of state.updates) Y.applyUpdate(doc, existing);
    }
    const meta = doc.getMap("meta");
    const before = meta.get("size") as Size | undefined;
    Y.applyUpdate(doc, update);
    const after = meta.get("size") as Size | undefined;
    if (sameSize(before, after)) return true;
    // A new document may initialize from its existing database dimensions.
    if (!before && sameSize(await readCompositionSize(target), after)) return true;
    return canResizeComposition(await readUploadPlan(userId));
  } finally {
    doc.destroy();
  }
}
