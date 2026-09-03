import type * as Y from "yjs";
import type StateManager from "@designcombo/state";
import { LAYER_SELECT } from "@designcombo/state";
import type { State } from "@designcombo/types";
import { dispatch } from "@designcombo/events";
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
  const applyDocToLocal = () => {
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
        const canvas = useStore.getState().timeline;
        const transitionsChanged =
          JSON.stringify(canvas?.transitionsMap ?? {}) !== JSON.stringify(snapshot.transitionsMap);

        if (canvas && transitionsChanged) {
          canvas.transitionsMap = snapshot.transitionsMap;
          canvas.transitionIds = snapshot.transitionIds;
          canvas.getTrackItems().forEach((item: any) => {
            const info = item.transitionInfo;
            const t = info?.transition;
            if (info && (!t || !t.id || !t.fromId || !t.toId)) {
              item.transitionInfo = undefined;
            }
          });
        }

        stateManager.updateState(statePatch, { updateHistory: false });

        const { activeIds } = stateManager.getState();
        if (activeIds.length) {
          const survivingIds = activeIds.filter(
            (id) =>
              (statePatch.trackItemsMap && id in statePatch.trackItemsMap) ||
              (statePatch.transitionsMap && id in statePatch.transitionsMap),
          );
          if (survivingIds.length !== activeIds.length) {
            dispatch(LAYER_SELECT, { payload: { trackItemIds: survivingIds } });
          }
        }

        useStore.setState({
          markers: snapshot.markers,
          trackItemsMap: snapshot.trackItemsMap,
          trackItemIds: snapshot.trackItemIds,
          transitionsMap: snapshot.transitionsMap,
          transitionIds: snapshot.transitionIds,
          tracks: snapshot.tracks,
          ...(snapshot.projectName !== undefined ? { projectName: snapshot.projectName } : {}),
          ...(snapshot.size ? { size: snapshot.size } : {}),
          ...(snapshot.fps !== undefined ? { fps: snapshot.fps } : {}),
          ...(snapshot.background ? { background: snapshot.background } : {}),
        });

        if (canvas && transitionsChanged) {
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
        Promise.resolve().then(() => {
          syncGuard.isApplyingRemote = false;
        });
      }
    } catch (err) {
      console.error("mirror-in: failed to apply transaction", err);
    }
  };

  const handleTransaction = (transaction: Y.Transaction) => {
    if (syncGuard.isApplyingRemote) return;

    if (transaction.origin === localOrigin) {
      // mirror-out just wrote this synchronously in reaction to our own
      // native dispatch, which is still unwinding its own subscriber
      // notifications on the call stack right now. Calling
      // stateManager.updateState() from here reentrantly corrupts that
      // in-progress notification (that's what broke local rendering when
      // this ran synchronously). Defer past the current stack: the native
      // dispatch finishes its own update first, and this runs after, as a
      // safety-net resync from the doc for whatever the native path didn't
      // apply (e.g. the split-after-undo case).
      Promise.resolve().then(applyDocToLocal);
      return;
    }

    applyDocToLocal();
  };

  schema.doc.on("afterTransaction", handleTransaction);
  return () => {
    schema.doc.off("afterTransaction", handleTransaction);
  };
}