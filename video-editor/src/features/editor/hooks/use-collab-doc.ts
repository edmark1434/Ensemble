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
import { createSession, endSession, loadSnapshot, attachPersistence } from "../collab/persistence";
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
}

// projectId here is the internal integer project_id sessions/snapshots key
// on — not the public_id string Editor currently receives as id/tempId.
// See flagged note in chat re: resolving that before this hook is wired in.
export function useCollabDoc(
  projectId: string | undefined,
  userId: string,
  stateManager: StateManager,
): CollabDoc | null {
  const [collab, setCollab] = useState<CollabDoc | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    let teardownMirrorIn: (() => void) | null = null;
    let teardownMirrorOutStateManager: (() => void) | null = null;
    let teardownMirrorOutStore: (() => void) | null = null;
    let teardownPersistence: (() => void) | null = null;
    let teardownWsProvider: (() => void) | null = null;
    let activeSessionId: number | null = null;

    const doc = new Y.Doc();
    const schema = createCollabSchema(doc);
    const syncGuard = createSyncGuard();
    const localOrigin = userId;

    const undoManager = new Y.UndoManager(
      [schema.trackItems, schema.trackItemIds, schema.transitions, schema.transitionIds, schema.tracks, schema.markers, schema.meta],
      { trackedOrigins: new Set([localOrigin]), captureTimeout: 300 },
    );

    setCollab({ doc, schema, undoManager, syncGuard, localOrigin, sessionId: null, ready: false, error: null });

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
        teardownPersistence = attachPersistence(schema, projectId, sessionId, localOrigin);
        teardownWsProvider = attachWsProvider(schema, projectId, userId);

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

          // guard this too, now that mirror-out exists — without it, this
          // read-from-doc immediately triggers mirror-out's stateManager/
          // zustand subscriptions and gets written straight back as if it
          // were a brand new local edit
          syncGuard.isApplyingRemote = true;
          try {
            stateManager.updateState(
              {
                trackItemsMap: snapshot.trackItemsMap,
                trackItemIds: snapshot.trackItemIds,
                transitionsMap: snapshot.transitionsMap,
                transitionIds: snapshot.transitionIds,
                tracks: snapshot.tracks,
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
      if (activeSessionId !== null) endSession(activeSessionId);
      useStore.getState().setCollabSchema(null, null);
      undoManager.destroy();
      doc.destroy();
      setCollab(null);
    };
  }, [projectId, userId, stateManager]);

  return collab;
}