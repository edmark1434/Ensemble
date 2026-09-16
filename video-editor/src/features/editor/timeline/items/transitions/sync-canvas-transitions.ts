// features/editor/timeline/items/sync-canvas-transitions.ts

import { ItransitionsMap } from "@designcombo/types";

// Every call site that pushes transitions onto the Fabric canvas needs the
// same steps, in the same order:
//   1. point the canvas at the new map (canvas.renderTransitions() reads
//      canvas.transitionsMap/transitionIds, not a function argument)
//   2. clear any track item's cached transitionInfo that no longer matches
//      a real entry in that map — a stale cached copy (same id, mismatched
//      fromId/toId) is what crashes canvas internals that dereference
//      transitionInfo.transition.fromId assuming it's whole; see
//      sanitizeTransitionInfo in ydoc-schema.ts for the doc-side half of
//      this same guard
//   3. ask the canvas to actually build/update the Transition Fabric
//      objects, then repaint
//
// Previously duplicated across mirror-in.ts and both branches of
// use-collab-doc.ts — with drift: the canvas-mount branch had silently
// dropped step 2. Centralizing here means every caller, including the
// local-edit path in timeline.tsx, behaves identically.
export function syncCanvasTransitions(
  canvas: any,
  transitionsMap: ItransitionsMap,
  logLabel: string,
): void {
  if (!canvas) return;

  canvas.transitionsMap = transitionsMap;
  canvas.transitionIds = Object.keys(transitionsMap);

  canvas.getTrackItems().forEach((item: any) => {
    const info = item.transitionInfo;
    const t = info?.transition;
    if (info && (!t || !t.id || !t.fromId || !t.toId)) {
      item.transitionInfo = undefined;
    }
  });

  try {
    // Called even when the map is now empty: the last transition being
    // removed still needs the canvas to drop its object.
    canvas.renderTransitions();
  } catch (err) {
    console.error(`${logLabel}: renderTransitions failed`, err);
  }

  canvas.requestRenderAll();
}