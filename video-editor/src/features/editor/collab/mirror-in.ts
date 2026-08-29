import type * as Y from "yjs";
import type StateManager from "@designcombo/state";
import type { State } from "@designcombo/types";
import useStore from "../store/use-store";
import { CollabSchema, readStateFromDoc } from "./ydoc-schema";
import { SyncGuard } from "./sync-guard";

// Pulls doc changes into stateManager (+ useStore for markers/projectName,
// which aren't part of designcombo's State type).
//
// Two things this filters out on purpose:
// - transactions with origin === localOrigin: these are our own writes made
//   by mirror-out, so stateManager already reflects them — re-applying would
//   just be a redundant no-op round trip.
// - undo/redo transactions are NOT filtered here, even though they're
//   "local": Y.UndoManager stamps its own transactions with itself as the
//   origin, not localOrigin, so they correctly fall through and get applied.
//   This is what makes Ctrl+Z actually update the canvas.
export function setupMirrorIn(
  schema: CollabSchema,
  stateManager: StateManager,
  localOrigin: string,
  syncGuard: SyncGuard,
): () => void {
  const handleTransaction = (transaction: Y.Transaction) => {
    if (transaction.origin === localOrigin) return;
    if (syncGuard.isApplyingRemote) return;

    try {
      const snapshot = readStateFromDoc(schema);

      const statePatch: Partial<State> = {
        trackItemsMap: snapshot.trackItemsMap,
        trackItemIds: snapshot.trackItemIds,
        transitionsMap: snapshot.transitionsMap,
        transitionIds: snapshot.transitionIds,
        tracks: snapshot.tracks,
      };
      if (snapshot.size) statePatch.size = snapshot.size;
      if (snapshot.fps !== undefined) statePatch.fps = snapshot.fps;
      if (snapshot.duration !== undefined) statePatch.duration = snapshot.duration;

      syncGuard.isApplyingRemote = true;
      try {
        stateManager.updateState(statePatch, { updateHistory: false });

        useStore.setState({
          markers: snapshot.markers,
          ...(snapshot.projectName !== undefined ? { projectName: snapshot.projectName } : {}),
          ...(snapshot.size ? { size: snapshot.size } : {}),
          ...(snapshot.fps !== undefined ? { fps: snapshot.fps } : {}),
          ...(snapshot.background ? { background: snapshot.background } : {}),
        });

        const canvas = useStore.getState().timeline;
        const transitionsChanged =
          JSON.stringify(canvas?.transitionsMap ?? {}) !== JSON.stringify(snapshot.transitionsMap);
        if (canvas && transitionsChanged) {
          canvas.transitionsMap = snapshot.transitionsMap;

          // Strip any stale transitionInfo left on fabric items (split leaves
          // half-built transition refs) — renderTransitions() dereferences
          // transitionInfo.transition.fromId per item, not just transitionsMap.
          canvas.getTrackItems().forEach((item: any) => {
            const info = item.transitionInfo;
            const t = info?.transition;
            if (info && (!t || !t.id || !t.fromId || !t.toId)) {
              item.transitionInfo = undefined;
            }
          });

          if (Object.keys(snapshot.transitionsMap).length > 0) {
            try {
              canvas.renderTransitions();
            } catch (renderErr) {
              console.error("mirror-in: renderTransitions failed, skipping this pass", renderErr);
            }
          }
          canvas.requestRenderAll();
        }
      } finally {
        syncGuard.isApplyingRemote = false;
      }
    } catch (err) {
      console.error("mirror-in: failed to apply remote transaction", err);
    }
  };

  schema.doc.on("afterTransaction", handleTransaction);
  return () => {
    schema.doc.off("afterTransaction", handleTransaction);
  };
}