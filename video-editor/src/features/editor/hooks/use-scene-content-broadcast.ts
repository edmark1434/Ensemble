import { useEffect } from "react";
import * as Y from "yjs";
import type StateManager from "@designcombo/state";
import useStore from "../store/use-store";
import { createCollabSchema, sanitizeDetails } from "../collab/ydoc-schema";
import { attachWsProvider } from "../collab/ws-provider";
import { createSession, endSession, attachPersistence } from "../collab/persistence";
import { applySceneContentToDoc, DURATION_SYNC_INTERVAL_MS } from "../collab/scene-content-sync";
import { SceneRenderContent } from "../types/ensemble-scene";

export function useSceneContentBroadcast(
  stateManager: StateManager,
  projectId: string | undefined,
  userId: string | undefined,
  sceneItemId: string | undefined,
) {
  useEffect(() => {
    if (!projectId || !userId || !sceneItemId) return;

    let cancelled = false;
    let wsSynced = false;
    let blockHydrated = false;
    let prevState: ReturnType<StateManager["getState"]> | null = null;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingPush = false;
    let activeSessionId: number | null = null;
    let forceFlush: (() => Promise<void>) | null = null;

    const doc = new Y.Doc({ gc: false });
    const schema = createCollabSchema(doc);
    const localOrigin = `${userId}:scene-broadcast`;
    const target = { kind: "project" as const, id: projectId };

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

    let retryCount = 0;
    const MAX_PUSH_RETRIES = 5;
    let currentPush: Promise<boolean> | null = null;

    const attemptPush = (): Promise<boolean> => {
      if (!wsSynced || !blockHydrated) return Promise.resolve(false);
      const applied = applySceneContentToDoc(schema, sceneItemId, buildContent(), stateManager.getState().duration, localOrigin);
      if (applied) {
        retryCount = 0;
        return Promise.resolve(true);
      }
      if (retryCount >= MAX_PUSH_RETRIES) {
        console.error("useSceneContentBroadcast: scene item never appeared in project doc", sceneItemId);
        retryCount = 0;
        return Promise.resolve(false);
      }
      retryCount += 1;
      return new Promise((resolve) => setTimeout(() => resolve(attemptPush()), 300));
    };

    // cancelled is no longer checked inside the push chain itself — a push
    // that's already running when the scene closes needs to be allowed to
    // finish (see cleanup below), not silently abandoned mid-retry.
    const push = (): Promise<boolean> => {
      currentPush = attemptPush().finally(() => {
        currentPush = null;
      });
      return currentPush;
    };

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

    // Own persistence, independent of the room's 60s internal timer or
    // the (now-delayed) empty-room flush — writes made here should be
    // durable within a few seconds, not up to a minute.
    createSession(projectId, userId).then((sessionId) => {
      if (cancelled) {
        endSession(sessionId);
        return;
      }
      activeSessionId = sessionId;
      const handle = attachPersistence(schema, target, sessionId, localOrigin);
      forceFlush = handle.forceFlush;
    });

    // Read current state right away instead of waiting for stateManager to
    // emit a change. Block hydration is a plain REST fetch and is usually
    // already done by the time we subscribe, so waiting for the "first" event
    // can mean waiting forever.
    blockHydrated = true;
    prevState = stateManager.getState();
    push();

    const subscription = stateManager.subscribe(() => {
      const state = stateManager.getState();

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

    const storeSubscription = useStore.subscribe((state, prevStoreState) => {
      if (state.background !== prevStoreState.background || state.size !== prevStoreState.size) {
        schedulePush();
      }
    });

    return () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      cancelled = true;
      subscription.unsubscribe();
      storeSubscription();
      schema.doc.off("afterTransaction", handleFirstSync);

      // Whatever was pending or already mid-retry has to actually land in
      // the project doc before we close the socket / destroy the doc below —
      // otherwise a retry's setTimeout fires into a torn-down doc/socket and
      // the last edit made in the scene silently never reaches the project.
      const settledPush = pendingPush ? push() : currentPush ?? Promise.resolve(true);
      pendingPush = false;

      settledPush.finally(() => {
        forceFlush?.()
          .catch((err) => {
            console.error("useSceneContentBroadcast: force flush on exit failed", err);
          })
          .finally(() => {
            teardownWs();
            schema.awareness.destroy();
            doc.destroy();
            if (activeSessionId !== null) endSession(activeSessionId);
          });
      });
    };
  }, [stateManager, projectId, userId, sceneItemId]);
}