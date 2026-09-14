import { useEffect } from "react";
import * as Y from "yjs";
import type StateManager from "@designcombo/state";
import useStore from "../store/use-store";
import { createCollabSchema, sanitizeDetails } from "../collab/ydoc-schema";
import { attachWsProvider } from "../collab/ws-provider";
import { createSession, endSession, attachPersistence } from "../collab/persistence";
import { applySceneContentToDoc, DURATION_SYNC_INTERVAL_MS } from "../collab/scene-content-sync";
import { SceneRenderContent } from "../types/ensemble-scene";
import {broadcastWorkingInsideScene, clearWorkingInsideScene} from "@/features/editor/collab/live-transform";

export function useSceneContentBroadcast(
  stateManager: StateManager,
  projectId: string | undefined,
  userId: string | undefined,
  userName: string | undefined,
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

    // The project's own name is still shown in the UI while inside a
    // scene, but nothing keeps it live here — the block-target
    // useCollabDoc instance never touches the project doc, and mirror-in
    // only ever routes projectName into `currentBlockName` when
    // !isProjectTarget. Piggyback on this connection (already open for
    // content broadcast) to mirror renames back into the store.
    const syncProjectName = (event: { keysChanged: Set<string> }) => {
      if (!event.keysChanged.has("projectName")) return;
      const name = schema.meta.get("projectName");
      if (typeof name === "string" && name !== useStore.getState().projectName) {
        useStore.setState({ projectName: name });
      }
    };
    schema.meta.observe(syncProjectName);

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

    const MAX_PUSH_RETRIES = 5;
    let currentPush: Promise<boolean> | null = null;
    let pushQueued = false;

    const attemptPush = (attempt: number): Promise<boolean> => {
      if (!wsSynced || !blockHydrated) return Promise.resolve(false);
      const applied = applySceneContentToDoc(schema, sceneItemId, buildContent(), stateManager.getState().duration, localOrigin);
      if (!applied) {
        console.debug("[scene-broadcast] miss", {
          sceneItemId,
          attempt,
          idsInDoc: schema.trackItemIds.toArray(),
          hasItem: schema.trackItems.has(sceneItemId),
          itemType: schema.trackItems.get(sceneItemId)?.get("type"),
        });
      }
      if (applied) {
        return Promise.resolve(true);
      }
      if (attempt >= MAX_PUSH_RETRIES) {
        console.error("useSceneContentBroadcast: scene item never appeared in project doc", sceneItemId);
        return Promise.resolve(false);
      }
      return new Promise((resolve) => setTimeout(() => resolve(attemptPush(attempt + 1)), 300));
    };

    // Only one retry chain runs at a time. A push requested while one is
    // already in flight just marks that another pass is needed once the
    // current one settles, instead of starting a second chain that would
    // share (and prematurely exhaust) the retry budget.
    const push = (): Promise<boolean> => {
      if (currentPush) {
        pushQueued = true;
        return currentPush;
      }
      currentPush = attemptPush(0).finally(() => {
        currentPush = null;
        if (pushQueued) {
          pushQueued = false;
          push();
        }
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
      console.debug("[scene-broadcast] wsSynced", { sceneItemId, idsInDoc: schema.trackItemIds.toArray() });
      push();
    };
    schema.doc.on("afterTransaction", handleFirstSync);

    const teardownWs = attachWsProvider(schema, target, userId, undefined, { announcePresence: false });
    broadcastWorkingInsideScene(schema.awareness, sceneItemId, userId, userName);

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
            clearWorkingInsideScene(schema.awareness);
            schema.meta.unobserve(syncProjectName);
            teardownWs();
            schema.awareness.destroy();
            doc.destroy();
            if (activeSessionId !== null) endSession(activeSessionId);
          });
      });
    };
  }, [stateManager, projectId, userId, userName, sceneItemId]);
}