import * as Y from "yjs";
import { CollabSchema, createCollabSchema } from "./ydoc-schema";
import { attachWsProvider } from "./ws-provider";
import { createSession, endSession, attachPersistence } from "./persistence";
import type { CollabTarget } from "./collab-target";
import {ISceneDetails} from "@/features/editor/types/ensemble-scene";
import {applySceneDetailsPatch} from "@/features/editor/collab/scene-content-sync";

const CONNECT_TIMEOUT_MS = 4000;

// One-shot write into a block's own Y.Doc from OUTSIDE that block's live
// session — e.g. editing a scene's size/background/name from
// basic-scene-item while browsing the project timeline, rather than from
// basic-scene while actually inside the block. Unlike
// useSceneContentBroadcast (which stays connected for as long as the user
// is inside a scene), this connects just long enough to sync, apply one
// meta patch, flush it, and tear everything down.
export function patchBlockMeta(
  projectId: string,
  blockId: string,
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new Y.Doc({ gc: false });
    const schema: CollabSchema = createCollabSchema(doc);
    const localOrigin = `${userId}:block-meta-patch`;
    const target: CollabTarget = { kind: "block", id: blockId };

    let settled = false;
    let teardownWs: (() => void) | null = null;
    let teardownPersistence: (() => void) | null = null;
    let sessionId: number | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      teardownPersistence?.();
      teardownWs?.();
      schema.awareness.destroy();
      doc.destroy();
      if (sessionId !== null) endSession(sessionId);
    };

    const finish = (err?: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (err) reject(err instanceof Error ? err : new Error(String(err)));
      else resolve();
    };

    timeout = setTimeout(
      () => finish(new Error("patchBlockMeta: timed out waiting for sync")),
      CONNECT_TIMEOUT_MS,
    );

    teardownWs = attachWsProvider(schema, target, userId, undefined, {
      announcePresence: false,
      // The server refused the connection (no access to this room): nothing
      // to patch, and retrying can't change that.
      onRejected: () => finish(),
      onFirstSync: () => {
        createSession(projectId, userId)
          .then((sid) => {
            sessionId = sid;
            const handle = attachPersistence(schema, target, sid, localOrigin);
            teardownPersistence = handle.teardown;

            schema.doc.transact(() => {
              for (const [key, value] of Object.entries(patch)) {
                schema.meta.set(key, value);
              }
            }, localOrigin);

            return handle.forceFlush();
          })
          .then(() => finish())
          .catch(finish);
      },
    });
  });
}

export function patchProjectSceneDetails(
  projectId: string,
  sceneItemId: string,
  userId: string,
  patch: Partial<ISceneDetails>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new Y.Doc({ gc: false });
    const schema: CollabSchema = createCollabSchema(doc);
    const localOrigin = `${userId}:project-scene-patch`;
    const target: CollabTarget = { kind: "project", id: projectId };

    let settled = false;
    let teardownWs: (() => void) | null = null;
    let teardownPersistence: (() => void) | null = null;
    let sessionId: number | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      teardownPersistence?.();
      teardownWs?.();
      schema.awareness.destroy();
      doc.destroy();
      if (sessionId !== null) endSession(sessionId);
    };

    const finish = (err?: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (err) reject(err instanceof Error ? err : new Error(String(err)));
      else resolve();
    };

    timeout = setTimeout(
      () => finish(new Error("patchProjectSceneDetails: timed out waiting for sync")),
      CONNECT_TIMEOUT_MS,
    );

    teardownWs = attachWsProvider(schema, target, userId, undefined, {
      announcePresence: false,
      // The server refused the connection (no access to this room): nothing
      // to patch, and retrying can't change that.
      onRejected: () => finish(),
      onFirstSync: () => {
        createSession(projectId, userId)
          .then((sid) => {
            sessionId = sid;
            const handle = attachPersistence(schema, target, sid, localOrigin);
            teardownPersistence = handle.teardown;

            applySceneDetailsPatch(schema, sceneItemId, patch, localOrigin);

            return handle.forceFlush();
          })
          .then(() => finish())
          .catch(finish);
      },
    });
  });
}