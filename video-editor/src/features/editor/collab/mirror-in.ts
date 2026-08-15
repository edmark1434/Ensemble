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

    // Simplification for now: reconcile everything on any change, rather
    // than inspecting transaction.changed to scope the patch to exactly
    // what moved. Fine at collab-edit frequency; revisit if profiling says
    // otherwise once concurrent editing volume is real.
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

    // Guard so a future mirror-out (watching these same stateManager
    // subscriptions) knows not to write this right back into the doc.
    syncGuard.isApplyingRemote = true;
    try {
      stateManager.updateState(statePatch, { updateHistory: false });

      // must stay inside the guard — setupMirrorOutFromStore listens for
      // this exact zustand write and needs isApplyingRemote still true,
      // or it treats this remote update as a local edit and echoes it back
      useStore.setState({
        markers: snapshot.markers,
        ...(snapshot.projectName !== undefined ? { projectName: snapshot.projectName } : {}),
        ...(snapshot.size ? { size: snapshot.size } : {}),
        ...(snapshot.fps !== undefined ? { fps: snapshot.fps } : {}),
        ...(snapshot.background ? { background: snapshot.background } : {}),
      });
    } finally {
      syncGuard.isApplyingRemote = false;
    }
  };

  schema.doc.on("afterTransaction", handleTransaction);
  return () => {
    schema.doc.off("afterTransaction", handleTransaction);
  };
}