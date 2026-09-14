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
  requestCompact,
  PersistenceHandle,
  PersistenceStatus,
} from "../collab/persistence";
import { setupMirrorOutFromStateManager, setupMirrorOutFromStore } from "../collab/mirror-out";
import { attachWsProvider } from "../collab/ws-provider";
import {CollabTarget} from "@/features/editor/collab/collab-target";
import {patchBlock, patchProject} from "@/features/editor/control-item/common/composition-controls";
import {isSceneItem} from "@/features/editor/types/ensemble-scene";
import {patchBlockMeta, patchProjectSceneDetails} from "@/features/editor/collab/remote-patch";

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
  compactStatus: "idle" | "compacting" | "error";
  forceSave: () => void;
}

// "Last resort" correction for drift between the durable Yjs doc (source of
// truth for rendering) and the blocks table's own name/width/height
// columns (source of truth for patchBlock's PATCH route, listings, etc.) —
// e.g. a PATCH already landed in Postgres, then a local undo reverted the
// same field in the doc, leaving Postgres pointing at a value the doc no
// longer holds. Always reconciled FROM the doc, never the other direction,
// at the two points a block's doc is guaranteed settled: right after it
// finishes loading, and right before it's torn down.
function reconcileTargetToDb(target: CollabTarget, schema: CollabSchema): void {
  const snapshot = readStateFromDoc(schema);
  const updates: { name?: string; width?: number; height?: number } = {};
  if (snapshot.projectName !== undefined) updates.name = snapshot.projectName;
  if (snapshot.size) {
    updates.width = snapshot.size.width;
    updates.height = snapshot.size.height;
  }
  if (Object.keys(updates).length === 0) return;

  const patch = target.kind === "block" ? patchBlock(target.id, updates) : patchProject(target.id, updates);
  patch.catch((err) => {
    console.error(`useCollabDoc: failed to reconcile ${target.kind} metadata to db`, err);
  });
}

// A project doc's Scene trackItem.details.name is a one-shot copy of its
// block's own name, kept in sync outside either doc's undo history.
// Re-push it whenever the project doc settles.
function reconcileSceneNamesToBlocks(target: CollabTarget, schema: CollabSchema, userId: string): void {
  if (target.kind !== "project") return;
  const snapshot = readStateFromDoc(schema);
  for (const item of Object.values(snapshot.trackItemsMap)) {
    if (!isSceneItem((item as any).type)) continue;
    const details = (item as any).details ?? {};
    if (!details.blockId || details.name === undefined) continue;

    patchBlockMeta(target.id, details.blockId, userId, { projectName: details.name }).catch((err) => {
      console.error("useCollabDoc: failed to reconcile scene name to block doc", err);
    });
    patchBlock(details.blockId, { name: details.name }).catch((err) => {
      console.error("useCollabDoc: failed to reconcile scene name to block db row", err);
    });
  }
}

// Mirror image: this block's own name is a one-shot copy on the project
// doc's Scene item. Undoing a rename made from inside the scene reverts
// this doc correctly but leaves the project's copy stale until this runs.
function reconcileBlockNameToProjectScene(target: CollabTarget, schema: CollabSchema, userId: string): void {
  if (target.kind !== "block") return;
  const snapshot = readStateFromDoc(schema);
  if (snapshot.projectName === undefined) return;
  const { projectId, activeSceneItemId } = useStore.getState();
  if (!projectId || !activeSceneItemId) return;
  patchProjectSceneDetails(projectId, activeSceneItemId, userId, { name: snapshot.projectName }).catch((err) => {
    console.error("useCollabDoc: failed to reconcile block name to project scene", err);
  });
}

// projectId here is the internal integer project_id sessions/snapshots key
// on — not the public_id string Editor currently receives as id/tempId.
// See flagged note in chat re: resolving that before this hook is wired in.
export function useCollabDoc(
  target: CollabTarget | undefined,
  rootProjectId: string | undefined,
  userId: string | undefined,
  userName: string | undefined,
  stateManager: StateManager,
): CollabDoc | null {
  const [collab, setCollab] = useState<CollabDoc | null>(null);

  useEffect(() => {
    if (!target || !rootProjectId || !userId) return;

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

    // Undo/redo mutates the doc directly and never re-runs whatever REST
    // call the original edit made — debounced since holding Ctrl+Z pops
    // several stack items in a burst; only the settled value matters.
    let undoReconcileTimer: ReturnType<typeof setTimeout> | null = null;
    const handleUndoRedo = (event: { changedParentTypes: Map<any, any> }) => {
      const metaChanged = event.changedParentTypes.has(schema.meta);
      const sceneNamesChanged = event.changedParentTypes.has(schema.trackItems);
      if (!metaChanged && !sceneNamesChanged) return;
      if (undoReconcileTimer) clearTimeout(undoReconcileTimer);
      undoReconcileTimer = setTimeout(() => {
        undoReconcileTimer = null;
        if (metaChanged) reconcileTargetToDb(target, schema);
        if (sceneNamesChanged) reconcileSceneNamesToBlocks(target, schema, userId);
        if (metaChanged) reconcileBlockNameToProjectScene(target, schema, userId);
      }, 500);
    };
    undoManager.on("stack-item-popped", handleUndoRedo);

    // Skips the debounce and persists whatever's queued right now — wired
    // up to the navbar's save-status button. Reads persistenceHandle at
    // call time (not creation time), so this stays a stable function
    // reference even though the handle itself isn't ready until the async
    // setup below completes.
    const forceSave = () => {
      if (cancelled) return;
      setCollab((prev) => (prev ? { ...prev, compactStatus: "compacting" } : prev));
      persistenceHandle
        ?.forceFlush()
        .then(() => requestCompact(target))
        .then(() => {
          if (cancelled) return;
          setCollab((prev) => (prev ? { ...prev, compactStatus: "idle" } : prev));
        })
        .catch((err) => {
          console.error("useCollabDoc: force save failed", err);
          if (cancelled) return;
          setCollab((prev) => (prev ? { ...prev, compactStatus: "error" } : prev));
        });
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
      compactStatus: "idle",
      forceSave,
    });

    (async () => {
      try {
        const [sessionId, persistedUpdate] = await Promise.all([
          createSession(rootProjectId, userId),
          loadSnapshot(target),
        ]);
        if (cancelled) return;
        activeSessionId = sessionId;

        Y.applyUpdate(doc, persistedUpdate, localOrigin);

        // listeners must exist before any further reads/writes below, or a
        // blank-project seed write here would never reach Postgres
        const isProjectTarget = target.kind === "project";
        teardownMirrorIn = setupMirrorIn(schema, stateManager, localOrigin, syncGuard, isProjectTarget);
        teardownMirrorOutStateManager = setupMirrorOutFromStateManager(schema, stateManager, localOrigin, syncGuard);
        teardownMirrorOutStore = setupMirrorOutFromStore(schema, localOrigin, syncGuard, isProjectTarget);
        persistenceHandle = attachPersistence(schema, target, sessionId, localOrigin, (status) => {
          setCollab((prev) => (prev ? { ...prev, saveStatus: status } : prev));
        });
        teardownPersistence = persistenceHandle.teardown;

        let resolveFirstSync: (() => void) | null = null;
        const firstSyncPromise = new Promise<void>((resolve) => { resolveFirstSync = resolve; });
        teardownWsProvider = attachWsProvider(schema, target, userId, userName, {
          onFirstSync: () => resolveFirstSync?.(),
        });

        // The REST snapshot we just applied is only as fresh as the last
        // flush/compaction — it can be genuinely mid-write for an item
        // another client is actively editing (a scene-content push).
        // Read/commit AFTER the live room has filled in whatever the
        // snapshot was missing, not before. Bounded so a slow/unreachable
        // socket doesn't hang the load.
        await Promise.race([
          firstSyncPromise,
          new Promise<void>((resolve) => setTimeout(resolve, 4000)),
        ]);
        if (cancelled) return;

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

        // Only a brand-new *project* doc gets seeded from whatever the
        // editor's currently showing — a block always already has its own
        // (possibly empty) snapshot from createBlock, so it must always
        // load from the doc, never from whatever project was open before.
        if (target.kind === "project" && isBlank) {

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
          let snapshot = readStateFromDoc(schema);
          let malformedIds = Object.entries(snapshot.trackItemsMap)
            .filter(([, item]) => !(item as any)?.display || typeof (item as any).display.from !== "number")
            .map(([id]) => id);

          // A track item's create and populate can still land as separate
          // transactions a beat apart even after first-sync. Recheck once
          // before giving up — dropping feeds this snapshot into
          // stateManager, and the next local edit's mirror-out reconcile
          // would delete the "missing" item from the shared doc for real.
          if (malformedIds.length > 0) {
            await new Promise((resolve) => setTimeout(resolve, 600));
            if (cancelled) return;
            snapshot = readStateFromDoc(schema);
            malformedIds = Object.entries(snapshot.trackItemsMap)
              .filter(([, item]) => !(item as any)?.display || typeof (item as any).display.from !== "number")
              .map(([id]) => id);
          }

          for (const id of malformedIds) {
            console.error("useCollabDoc: dropping malformed item on load", id, snapshot.trackItemsMap[id]);
            delete snapshot.trackItemsMap[id];
          }
          snapshot.trackItemIds = snapshot.trackItemIds.filter((id) => id in snapshot.trackItemsMap);
          for (const track of snapshot.tracks) {
            track.items = track.items.filter((id) => id in snapshot.trackItemsMap);
          }

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

            try {
              stateManager.updateState(
                {
                  trackItemsMap: snapshot.trackItemsMap,
                  trackItemIds: snapshot.trackItemIds,
                  transitionsMap: snapshot.transitionsMap,
                  transitionIds: snapshot.transitionIds,
                  tracks: snapshot.tracks,
                  ...(snapshot.size ? { size: snapshot.size } : {}),
                  fps: snapshot.fps ?? 30,
                  duration: snapshot.duration ?? 0,
                },
                { updateHistory: false },
              );
            } catch (updateErr) {
              console.error("useCollabDoc: stateManager.updateState failed on load", updateErr, snapshot);
              return;
            }

            useStore.setState({
              markers: snapshot.markers,
              ...(isProjectTarget && snapshot.projectName !== undefined ? { projectName: snapshot.projectName } : {}),
              ...(!isProjectTarget && snapshot.projectName !== undefined ? { currentBlockName: snapshot.projectName } : {}),
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

        reconcileTargetToDb(target, schema);
        reconcileSceneNamesToBlocks(target, schema, userId);
        reconcileBlockNameToProjectScene(target, schema, userId);

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
      undoManager.off("stack-item-popped", handleUndoRedo);
      if (undoReconcileTimer) clearTimeout(undoReconcileTimer);
      teardownMirrorIn?.();
      teardownMirrorOutStateManager?.();
      teardownMirrorOutStore?.();
      teardownPersistence?.();
      teardownWsProvider?.();
      teardownTimelineWatch?.();
      if (timelineResyncInterval) clearInterval(timelineResyncInterval);
      if (activeSessionId !== null) endSession(activeSessionId);

      reconcileTargetToDb(target, schema);
      reconcileSceneNamesToBlocks(target, schema, userId);
      reconcileBlockNameToProjectScene(target, schema, userId);

      useStore.getState().setCollabSchema(null, null);
      undoManager.destroy();
      schema.awareness.destroy();
      doc.destroy();
      setCollab(null);
    };
  }, [target?.kind, target?.id, rootProjectId, userId, userName, stateManager]);

  return collab;
}