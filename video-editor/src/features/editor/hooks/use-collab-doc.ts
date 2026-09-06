import { useEffect, useState } from "react";
import * as Y from "yjs";
import type StateManager from "@designcombo/state";
import useStore from "../store/use-store";
import {
  CollabSchema,
  createCollabSchema,
  hydrateDocFromState,
  readStateFromDoc,
} from "../collab/ydoc-schema";
import { setupMirrorIn } from "../collab/mirror-in";
import { createSyncGuard, SyncGuard } from "../collab/sync-guard";
import {
  createSession,
  endSession,
  loadSnapshot,
  attachPersistence,
  PersistenceHandle,
  PersistenceStatus,
} from "../collab/persistence";
import { setupMirrorOutFromStateManager, setupMirrorOutFromStore } from "../collab/mirror-out";
import { attachWsProvider } from "../collab/ws-provider";

export interface CollabDoc {
  doc: Y.Doc;
  schema: CollabSchema;
  undoManager: Y.UndoManager;
  syncGuard: SyncGuard;
  localOrigin: string;
  sessionId: number | null;
  ready: boolean;
  error: Error | null;
  saveStatus: PersistenceStatus;
  forceSave: () => void;
}

// projectId here is the internal integer project_id sessions/snapshots key
// on — not the public_id string Editor currently receives as id/tempId.
// See flagged note in chat re: resolving that before this hook is wired in.
export function useCollabDoc(
  projectId: string | undefined,
  userId: string | undefined,
  userName: string | undefined,
  stateManager: StateManager,
): CollabDoc | null {
  const [collab, setCollab] = useState<CollabDoc | null>(null);

  useEffect(() => {
    if (!projectId || !userId) return;

    let cancelled = false;
    let teardownMirrorIn: (() => void) | null = null;
    let teardownMirrorOutStateManager: (() => void) | null = null;
    let teardownMirrorOutStore: (() => void) | null = null;
    let teardownPersistence: (() => void) | null = null;
    let teardownWsProvider: (() => void) | null = null;
    let teardownTimelineWatch: (() => void) | null = null;
    let activeSessionId: number | null = null;
    let timelineResyncInterval: ReturnType<typeof setInterval> | null = null;
    let persistenceHandle: PersistenceHandle | null = null;

    const doc = new Y.Doc({ gc: false });
    const schema = createCollabSchema(doc);
    const syncGuard = createSyncGuard();
    const localOrigin = userId;

    const undoManager = new Y.UndoManager(
      [schema.trackItems, schema.trackItemIds, schema.transitions, schema.transitionIds, schema.tracks, schema.markers, schema.meta],
      { trackedOrigins: new Set([localOrigin]), captureTimeout: 300 },
    );

    // Skips the debounce and persists whatever's queued right now — wired
    // up to the navbar's save-status button. Reads persistenceHandle at
    // call time (not creation time), so this stays a stable function
    // reference even though the handle itself isn't ready until the async
    // setup below completes.
    const forceSave = () => {
      persistenceHandle?.forceFlush();
    };

    setCollab({
      doc,
      schema,
      undoManager,
      syncGuard,
      localOrigin,
      sessionId: null,
      ready: false,
      error: null,
      saveStatus: "saved",
      forceSave,
    });

    (async () => {
      try {
        const [sessionId, persistedUpdate] = await Promise.all([
          createSession(projectId, userId),
          loadSnapshot(projectId),
        ]);
        if (cancelled) return;
        activeSessionId = sessionId;

        Y.applyUpdate(doc, persistedUpdate, localOrigin);

        // listeners must exist before any further reads/writes below, or a
        // blank-project seed write here would never reach Postgres
        teardownMirrorIn = setupMirrorIn(schema, stateManager, localOrigin, syncGuard);
        teardownMirrorOutStateManager = setupMirrorOutFromStateManager(schema, stateManager, localOrigin, syncGuard);
        teardownMirrorOutStore = setupMirrorOutFromStore(schema, localOrigin, syncGuard);
        persistenceHandle = attachPersistence(schema, projectId, sessionId, localOrigin, (status) => {
          setCollab((prev) => (prev ? { ...prev, saveStatus: status } : prev));
        });
        teardownPersistence = persistenceHandle.teardown;
        teardownWsProvider = attachWsProvider(schema, projectId, userId, userName);
        teardownTimelineWatch = useStore.subscribe((state, prevState) => {
          // Compare identity, not just nullity — every remount produces a
          // genuinely new CanvasTimeline instance, and each one needs this
          // resync, not just the very first canvas of the session.
          if (state.timeline && state.timeline !== prevState.timeline) {
            // A previous canvas's resync loop is now pointed at a dead
            // canvas — stop it before starting a new one, or the two
            // loops share `timelineResyncInterval` and can end up
            // clearing each other's interval id instead of their own.
            if (timelineResyncInterval) {
              clearInterval(timelineResyncInterval);
              timelineResyncInterval = null;
            }

            const resyncCanvas = () => {
              const canvas = useStore.getState().timeline as any;
              if (!canvas) return;
              const current = stateManager.getState();

              const onCanvas = new Set(canvas.getTrackItems().map((item: any) => item.id));
              const inState: string[] = current.trackItemIds ?? [];
              const missingIds = inState.filter((id) => !onCanvas.has(id));
              const staleIds = [...onCanvas].filter((id) => !inState.includes(id as string));

              if (missingIds.length > 0 || staleIds.length > 0) {
                try {
                  if (staleIds.length > 0) canvas.deleteTrackItemById(staleIds);
                  canvas.tracks = current.tracks;
                  canvas.trackItemsMap = current.trackItemsMap;
                  missingIds.forEach((id) => canvas.addTrackItem({ ...current.trackItemsMap[id] }));
                  canvas.trackItemIds = current.trackItemIds;
                  canvas.renderTracks();
                  canvas.alignItemsToTrack();
                  canvas.updateTrackItemCoords();
                  canvas.calcBounding();
                  canvas.refreshTrackLayout();
                } catch (err) {
                  console.error("useCollabDoc: track item resync failed on canvas mount", err);
                }
              }

              // existing transitions logic stays as-is, just rename resyncTransitions -> resyncCanvas
              canvas.transitionsMap = current.transitionsMap ?? {};
              canvas.transitionIds = Object.keys(current.transitionsMap ?? {});
              if (Object.keys(current.transitionsMap ?? {}).length > 0) {
                try { canvas.renderTransitions(); } catch (err) {
                  console.error("useCollabDoc: renderTransitions failed on canvas mount", err);
                }
              }
              canvas.requestRenderAll();
            };

            // Timeline's own mount hydration can finish *after* `timeline` shows
            // up in the store and clobber transitionsMap once it does — a single
            // sync here can lose that race. Keep re-asserting for a few seconds
            // so whichever runs last is always the correct data, then stop.
            resyncCanvas();
            let ticks = 0;
            timelineResyncInterval = setInterval(() => {
              resyncCanvas();
              ticks += 1;
              if (ticks >= 10) {
                clearInterval(timelineResyncInterval!);
                timelineResyncInterval = null;
              }
            }, 300);
          }
        });

        const isBlank = schema.trackItemIds.length === 0 && schema.tracks.length === 0;

        if (isBlank) {
          // brand new project — server gave us an empty doc. Seed it from
          // whatever stateManager/zustand hold as their just-initialized
          // defaults; attachPersistence (wired above) picks up this write
          // and flushes it as the project's real first content.
          const current = stateManager.getState();
          const { markers, projectName, size, fps, background } = useStore.getState();
          hydrateDocFromState(
            schema,
            {
              trackItemsMap: current.trackItemsMap,
              trackItemIds: current.trackItemIds,
              transitionsMap: current.transitionsMap,
              transitionIds: current.transitionIds,
              tracks: current.tracks,
              size,
              fps,
              duration: current.duration,
              background,
            },
            markers,
            projectName,
            localOrigin,
          );
        } else {
          const snapshot = readStateFromDoc(schema);

          syncGuard.isApplyingRemote = true;
          try {
            const canvas = useStore.getState().timeline as any;
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

            stateManager.updateState(
              {
                trackItemsMap: snapshot.trackItemsMap,
                trackItemIds: snapshot.trackItemIds,
                transitionsMap: snapshot.transitionsMap,
                transitionIds: snapshot.transitionIds,
                tracks: snapshot.tracks,
                ...(snapshot.size ? { size: snapshot.size } : {}),
                ...(snapshot.fps !== undefined ? { fps: snapshot.fps } : {}),
                ...(snapshot.duration !== undefined ? { duration: snapshot.duration } : {}),
              },
              { updateHistory: false },
            );
            useStore.setState({
              markers: snapshot.markers,
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
                  console.error("useCollabDoc: renderTransitions failed on initial load", renderErr);
                }
              }
              canvas.requestRenderAll();
            }
          } finally {
            syncGuard.isApplyingRemote = false;
          }
        }

        undoManager.clear();
        if (cancelled) return;

        useStore.getState().setCollabSchema(schema, localOrigin);
        setCollab((prev) => (prev ? { ...prev, sessionId, ready: true } : prev));
      } catch (err) {
        console.error("useCollabDoc failed to initialize", err);
        if (!cancelled) {
          setCollab((prev) => (prev ? { ...prev, error: err instanceof Error ? err : new Error(String(err)) } : prev));
        }
      }
    })();

    return () => {
      cancelled = true;
      teardownMirrorIn?.();
      teardownMirrorOutStateManager?.();
      teardownMirrorOutStore?.();
      teardownPersistence?.();
      teardownWsProvider?.();
      teardownTimelineWatch?.();
      if (timelineResyncInterval) clearInterval(timelineResyncInterval);
      if (activeSessionId !== null) endSession(activeSessionId);
      useStore.getState().setCollabSchema(null, null);
      undoManager.destroy();
      schema.awareness.destroy();
      doc.destroy();
      setCollab(null);
    };
  }, [projectId, userId, userName, stateManager]);

  return collab;
}