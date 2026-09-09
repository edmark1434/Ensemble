import { useEffect } from "react";
import * as Y from "yjs";
import type StateManager from "@designcombo/state";
import { createCollabSchema } from "../collab/ydoc-schema";
import { attachWsProvider } from "../collab/ws-provider";
import { applySceneContentDurationToDoc, DURATION_SYNC_INTERVAL_MS } from "../collab/scene-duration-sync";

// While a scene is open, useCollabDoc has fully torn down the project
// connection to mirror the block instead — nothing is left attached to
// the project room for other collaborators to see this scene item's
// resize/ripple from until you exit. This opens a second, independent
// connection to the project room purely to write that derived change
// live. No mirror-in/out of its own: the block's live duration is
// already in stateManager (that's what's currently being mirrored), so
// this just reads stateManager.getState().duration and pushes it.
export function useSceneDurationBroadcast(
  stateManager: StateManager,
  projectId: string | undefined,
  userId: string | undefined,
  sceneItemId: string | undefined,
) {
  useEffect(() => {
    if (!projectId || !userId || !sceneItemId) return;

    let cancelled = false;
    // Two independent async things have to finish before a push is safe:
    // the WS connection to the project room (wsSynced) and the block's
    // own content landing in stateManager (blockHydrated). Either can
    // finish first — push() only actually writes once both are true, and
    // we call push() from both completion points so whichever one
    // finishes second is what triggers the write.
    let wsSynced = false;
    let blockHydrated = false;
    let prevDuration: number | null = null;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingPush = false;

    const doc = new Y.Doc({ gc: false });
    const schema = createCollabSchema(doc);
    const localOrigin = `${userId}:scene-duration`;

    const push = () => {
      if (cancelled || !wsSynced || !blockHydrated) return;
      applySceneContentDurationToDoc(schema, sceneItemId, stateManager.getState().duration, localOrigin);
    };

    // Coalesces a burst of duration changes (every frame of a resize drag
    // fires stateManager.subscribe) into at most one push per
    // DURATION_SYNC_INTERVAL_MS. Same throttle-then-flush shape as
    // persistence.ts's flush timer: the first change in a burst schedules
    // the timer, later changes in that window just update what's pending,
    // and the timer fires once to push whatever the latest duration is
    // by then — not one transact+broadcast per frame.
    const schedulePush = () => {
      pendingPush = true;
      if (!flushTimer) {
        flushTimer = setTimeout(() => {
          flushTimer = null;
          if (!pendingPush) return;
          pendingPush = false;
          push();
        }, DURATION_SYNC_INTERVAL_MS);
      }
    };

    const handleFirstSync = () => {
      schema.doc.off("afterTransaction", handleFirstSync);
      wsSynced = true;
      push();
    };
    schema.doc.on("afterTransaction", handleFirstSync);

    const teardownWs = attachWsProvider(schema, projectId, userId, undefined, { announcePresence: false });

    const subscription = stateManager.subscribe(() => {
      if (!blockHydrated) {
        // First notification after mount is the block's own hydration
        // landing in stateManager, not a real content edit — record it
        // as the baseline duration and flip blockHydrated, so a WS sync
        // that already finished can now safely push. Not throttled: this
        // is a one-time catch-up, not a burst.
        blockHydrated = true;
        prevDuration = stateManager.getState().duration;
        push();
        return;
      }
      const duration = stateManager.getState().duration;
      if (duration === prevDuration) return;
      prevDuration = duration;
      schedulePush();
    });

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      // Flush a pending change rather than dropping it on teardown (e.g.
      // the user resizes and immediately exits the scene). Must run
      // before `cancelled` is set (push() checks it) and before the WS
      // connection closes below.
      if (pendingPush) {
        pendingPush = false;
        push();
      }
      cancelled = true;
      subscription.unsubscribe();
      schema.doc.off("afterTransaction", handleFirstSync);
      teardownWs();
      schema.awareness.destroy();
      doc.destroy();
    };
  }, [stateManager, projectId, userId, sceneItemId]);
}