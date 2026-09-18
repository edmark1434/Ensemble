import type * as Y from "yjs";
import type StateManager from "@designcombo/state";
import { LAYER_SELECT } from "@designcombo/state";
import type { State } from "@designcombo/types";
import { dispatch } from "@designcombo/events";
import useStore from "../store/use-store";
import { CollabSchema, readStateFromDoc } from "./ydoc-schema";
import { SyncGuard } from "./sync-guard";
import {isSceneItem} from "@/features/editor/types/ensemble-scene";
import { syncCanvasTransitions } from "../timeline/items/transitions/sync-canvas-transitions";

// Field-wise, order-insensitive compare. The old JSON.stringify compare
// was sensitive to key insertion order, so it reported phantom changes
// after any map rebuild, and it compared whole transition objects, so an
// incidental field could mask a real fromId/toId change.
function sameTransitions(
  a: Record<string, any>,
  b: Record<string, any>,
): boolean {
  const aIds = Object.keys(a);
  if (aIds.length !== Object.keys(b).length) return false;
  for (const id of aIds) {
    const x = a[id];
    const y = b[id];
    if (!y) return false;
    if (
      x.fromId !== y.fromId ||
      x.toId !== y.toId ||
      x.kind !== y.kind ||
      x.duration !== y.duration ||
      x.direction !== y.direction
    ) {
      return false;
    }
  }
  return true;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

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
  isProjectTarget: boolean,
): () => void {
  const applyDocToLocal = () => {
    if (syncGuard.isApplyingRemote) return;

    try {
      // Mirrors mirror-out's reconcileContentMap, in the other direction: keep
// the OLD reference for anything unchanged, so a transaction that only
// touched one item doesn't hand every other item a new object identity
// (which busts React.memo / Zustand selectors / Remotion prop-diffing
// for everything on screen, not just the thing that actually changed).
      function reconcileMapReferences<T>(prevMap: Record<string, T>, nextMap: Record<string, T>): Record<string, T> {
        const nextIds = Object.keys(nextMap);
        let anyChanged = nextIds.length !== Object.keys(prevMap).length;
        const result: Record<string, T> = {};
        for (const id of nextIds) {
          const prev = prevMap[id];
          const next = nextMap[id];
          if (prev && JSON.stringify(prev) === JSON.stringify(next)) {
            result[id] = prev;
          } else {
            result[id] = next;
            anyChanged = true;
          }
        }
        return anyChanged ? result : prevMap;
      }

      const snapshot = readStateFromDoc(schema);
      const current = stateManager.getState();
      const statePatch: Partial<State> = {
        trackItemsMap: reconcileMapReferences(current.trackItemsMap, snapshot.trackItemsMap),
        trackItemIds: arraysEqual(current.trackItemIds, snapshot.trackItemIds) ? current.trackItemIds : snapshot.trackItemIds,
        transitionsMap: reconcileMapReferences(current.transitionsMap, snapshot.transitionsMap),
        transitionIds: arraysEqual(current.transitionIds, snapshot.transitionIds) ? current.transitionIds : snapshot.transitionIds,
        tracks: snapshot.tracks,
      };
      if (snapshot.size) statePatch.size = snapshot.size;
      if (snapshot.fps !== undefined) statePatch.fps = snapshot.fps;
      if (snapshot.duration !== undefined) statePatch.duration = snapshot.duration;

      syncGuard.isApplyingRemote = true;
      try {
        const canvas = useStore.getState().timeline;
        const transitionsChanged = !sameTransitions(canvas?.transitionsMap ?? {}, snapshot.transitionsMap);

        if (snapshot.orphanTransitionIds.length) {
          // Not an error and not a leak — these stay in the doc and come
          // back on their own once their endpoints resolve. Logged because
          // a *persistently* orphaned id means something upstream cloned a
          // transition without remapping its endpoint ids.
          console.debug("mirror-in: transitions withheld this pass", snapshot.orphanTransitionIds);
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
          // A block's own doc never owns the project's name — only mirror
          // this in from a project-kind doc, or a block's snapshot would
          // clobber the title the navbar shows. A block doc's own
          // "projectName" field (see hydrateDocFromState) is really the
          // block/scene's own name, so route it to currentBlockName instead —
          // that's what basic-scene displays, and it keeps renames live
          // across collaborators the same way everything else does.
          ...(isProjectTarget && snapshot.projectName !== undefined ? { projectName: snapshot.projectName } : {}),
          ...(!isProjectTarget && snapshot.projectName !== undefined ? { currentBlockName: snapshot.projectName } : {}),
          ...(snapshot.size ? { size: snapshot.size } : {}),
          ...(snapshot.fps !== undefined ? { fps: snapshot.fps } : {}),
          ...(snapshot.background ? { background: snapshot.background } : {}),
        });

        // Everything the canvas needs (transitionsMap/transitionIds,
        // stale transitionInfo cleanup, the render call itself) happens
        // together, AFTER stateManager/useStore hold the new snapshot —
        // see sync-canvas-transitions.ts for why all three steps have to
        // run as one unit.
        if (canvas && transitionsChanged) {
          syncCanvasTransitions(canvas, snapshot.transitionsMap, "mirror-in");
        }
      } finally {
        syncGuard.isApplyingRemote = false;
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