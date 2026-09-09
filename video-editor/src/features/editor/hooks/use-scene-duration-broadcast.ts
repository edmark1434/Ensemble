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
    let synced = false;
    let skippedInitialReplay = false;
    let prevDuration: number | null = null;
    let lastPush = 0;
    let pending: ReturnType<typeof setTimeout> | null = null;

    const doc = new Y.Doc({ gc: false });
    const schema = createCollabSchema(doc);
    const localOrigin = `${userId}:scene-duration`;

    const push = () => {
      if (pending) { clearTimeout(pending); pending = null; }
      if (cancelled || !synced) return;
      lastPush = Date.now();
      applySceneContentDurationToDoc(schema, sceneItemId, stateManager.getState().duration, localOrigin);
    };

    const pushThrottled = () => {
      const elapsed = Date.now() - lastPush;
      if (elapsed >= DURATION_SYNC_INTERVAL_MS) push();
      else if (!pending) pending = setTimeout(push, DURATION_SYNC_INTERVAL_MS - elapsed);
    };

    // First afterTransaction firing is the inbound syncStep2 landing —
    // our signal this doc now holds real room content, safe to write into.
    const handleFirstSync = () => {
      schema.doc.off("afterTransaction", handleFirstSync);
      synced = true;
      pushThrottled();
    };
    schema.doc.on("afterTransaction", handleFirstSync);

    const teardownWs = attachWsProvider(schema, projectId, userId, undefined, { announcePresence: false });

    const subscription = stateManager.subscribe(() => {
      if (!skippedInitialReplay) {
        skippedInitialReplay = true;
        prevDuration = stateManager.getState().duration;
        return;
      }
      const duration = stateManager.getState().duration;
      if (duration === prevDuration) return;
      prevDuration = duration;
      pushThrottled();
    });

    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      subscription.unsubscribe();
      schema.doc.off("afterTransaction", handleFirstSync);
      teardownWs();
      schema.awareness.destroy();
      doc.destroy();
    };
  }, [stateManager, projectId, userId, sceneItemId]);
}