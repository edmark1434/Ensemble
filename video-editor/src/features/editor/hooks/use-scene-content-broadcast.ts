import { useEffect } from "react";
import * as Y from "yjs";
import type StateManager from "@designcombo/state";
import useStore from "../store/use-store";
import { createCollabSchema, sanitizeDetails } from "../collab/ydoc-schema";
import { attachWsProvider } from "../collab/ws-provider";
import { applySceneContentToDoc, DURATION_SYNC_INTERVAL_MS } from "../collab/scene-content-sync";
import { SceneRenderContent } from "../types/ensemble-scene";

// While a scene is open, useCollabDoc has fully torn down the project
// connection to mirror the block instead — nothing is left attached to
// the project room for other collaborators to see this scene item's
// content/duration changes from until you exit. This opens a second,
// independent connection to the project room purely to write those
// derived changes live. No mirror-in/out of its own: the block's live
// content + duration are already in stateManager (that's what's currently
// being mirrored), so this just reads stateManager.getState() /
// useStore.getState() and pushes them.
export function useSceneContentBroadcast(
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
    let prevState: ReturnType<StateManager["getState"]> | null = null;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingPush = false;

    const doc = new Y.Doc({ gc: false });
    const schema = createCollabSchema(doc);
    const localOrigin = `${userId}:scene-broadcast`;

    const buildContent = (): SceneRenderContent => {
      const state = stateManager.getState();
      const { size, background } = useStore.getState();
      return {
        trackItemsMap: Object.fromEntries(
          Object.entries(state.trackItemsMap).map(([id, item]) => [
            id,
            { ...item, details: sanitizeDetails((item as any).details) },
          ]),
        ) as typeof state.trackItemsMap,
        trackItemIds: state.trackItemIds,
        transitionsMap: state.transitionsMap,
        size,
        background,
      };
    };

    const push = () => {
      if (cancelled || !wsSynced || !blockHydrated) return;
      applySceneContentToDoc(schema, sceneItemId, buildContent(), stateManager.getState().duration, localOrigin);
    };

    // Coalesces a burst of changes (every frame of a drag/resize fires
    // stateManager.subscribe) into at most one push per
    // DURATION_SYNC_INTERVAL_MS. Same throttle-then-flush shape as
    // persistence.ts's flush timer.
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
      const state = stateManager.getState();

      if (!blockHydrated) {
        // First notification after mount is the block's own hydration
        // landing in stateManager, not a real edit — record it as the
        // baseline and flip blockHydrated, so a WS sync that already
        // finished can now safely push. Not throttled: one-time catch-up.
        blockHydrated = true;
        prevState = state;
        push();
        return;
      }

      // Same "did anything we actually persist change" check as
      // mirror-out.ts's setupMirrorOutFromStateManager — selection-only
      // notifications are most of what fires here and shouldn't push.
      const relevantChanged =
        !prevState ||
        state.trackItemsMap !== prevState.trackItemsMap ||
        state.trackItemIds !== prevState.trackItemIds ||
        state.transitionsMap !== prevState.transitionsMap ||
        state.transitionIds !== prevState.transitionIds ||
        state.tracks !== prevState.tracks ||
        state.duration !== prevState.duration ||
        state.size !== prevState.size;

      prevState = state;
      if (!relevantChanged) return;
      schedulePush();
    });

    // size/background can change straight through zustand without ever
    // touching stateManager (CompositionControls sets them via setState
    // directly) — same gap setupMirrorOutFromStore exists to cover.
    const storeSubscription = useStore.subscribe((state, prevStoreState) => {
      if (state.background !== prevStoreState.background || state.size !== prevStoreState.size) {
        schedulePush();
      }
    });

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      // Flush a pending change rather than dropping it on teardown (e.g.
      // user edits and immediately exits the scene). Must run before
      // `cancelled` is set (push() checks it) and before the WS closes.
      if (pendingPush) {
        pendingPush = false;
        push();
      }
      cancelled = true;
      subscription.unsubscribe();
      storeSubscription();
      schema.doc.off("afterTransaction", handleFirstSync);
      teardownWs();
      schema.awareness.destroy();
      doc.destroy();
    };
  }, [stateManager, projectId, userId, sceneItemId]);
}