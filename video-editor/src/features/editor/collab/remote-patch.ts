import * as Y from "yjs";
import type { ITrackItem } from "@designcombo/types";
import { CollabSchema, createCollabSchema } from "./ydoc-schema";
import { attachWsProvider } from "./ws-provider";
import { createSession, endSession, toArrayBuffer } from "./persistence";
import { collabApiBase, type CollabTarget } from "./collab-target";
import { ISceneDetails } from "@/features/editor/types/ensemble-scene";
import { applySceneDetailsPatch } from "@/features/editor/collab/scene-content-sync";

// A cold room may need database hydration before it can send its first sync.
// Each subsequent network stage gets its own deadline.
const SYNC_TIMEOUT_MS = 15_000;
const REQUEST_TIMEOUT_MS = 15_000;

function patchRemoteDoc(
  projectId: string,
  userId: string,
  target: CollabTarget,
  operation: string,
  localOrigin: string,
  applyPatch: (schema: CollabSchema) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new Y.Doc({ gc: false });
    const schema = createCollabSchema(doc);
    const saveController = new AbortController();
    let settled = false;
    let patchStarted = false;
    let teardownWs: (() => void) | null = null;
    let sessionId: number | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      saveController.abort();
      teardownWs?.();
      schema.awareness.destroy();
      doc.destroy();
      if (sessionId !== null) endSession(sessionId);
      if (error) reject(error instanceof Error ? error : new Error(String(error)));
      else resolve();
    };

    const startDeadline = (stage: string, duration: number) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => finish(new Error(`${operation}: timed out ${stage}`)), duration);
    };

    const applyAfterSync = async () => {
      // The provider can announce sync again after reconnecting. This operation
      // owns exactly one session and one patch, even if that happens mid-save.
      if (settled || patchStarted) return;
      patchStarted = true;
      startDeadline("creating a collaboration session", REQUEST_TIMEOUT_MS);
      try {
        const sid = await createSession(projectId, userId);
        if (settled) {
          // Session creation can complete after its deadline. Close that late
          // session without accessing the document we already destroyed.
          endSession(sid);
          return;
        }
        sessionId = sid;
        startDeadline("saving the update", REQUEST_TIMEOUT_MS);

        const updates: Uint8Array[] = [];
        const collect = (update: Uint8Array, origin: unknown) => {
          if (origin === localOrigin) updates.push(update);
        };
        doc.on("update", collect);
        try { applyPatch(schema); }
        finally { doc.off("update", collect); }

        if (updates.length > 0) {
          // A short-lived patch must await its own durable save. The live-doc
          // persistence adapter retries in the background and can outlive teardown.
          const update = updates.length === 1 ? updates[0] : Y.mergeUpdates(updates);
          const response = await fetch(`${collabApiBase(target)}/updates?sessionId=${sid}`, {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: toArrayBuffer(update),
            signal: saveController.signal,
          });
          if (settled) return;
          if (!response.ok) throw new Error(`${operation}: saving the update failed (${response.status})`);
        }
        finish();
      } catch (error) { finish(error); }
    };

    startDeadline("waiting for initial sync", SYNC_TIMEOUT_MS);
    try {
      teardownWs = attachWsProvider(schema, target, userId, undefined, {
        announcePresence: false,
        // Preserve the existing behavior for inaccessible reconciliation targets.
        onRejected: () => finish(),
        onFirstSync: () => { void applyAfterSync(); },
      });
    } catch (error) { finish(error); }
  });
}

// Update a block's own document while browsing the project timeline.
export function patchBlockMeta(
  projectId: string,
  blockId: string,
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const origin = `${userId}:block-meta-patch`;
  return patchRemoteDoc(projectId, userId, { kind: "block", id: blockId }, "patchBlockMeta", origin, schema => {
    schema.doc.transact(() => {
      for (const [key, value] of Object.entries(patch)) schema.meta.set(key, value);
    }, origin);
  });
}

export function patchProjectSceneDetails(
  projectId: string,
  sceneItemId: string,
  userId: string,
  patch: Partial<ISceneDetails>,
): Promise<void> {
  const origin = `${userId}:project-scene-patch`;
  return patchRemoteDoc(projectId, userId, { kind: "project", id: projectId }, "patchProjectSceneDetails", origin, schema => {
    applySceneDetailsPatch(schema, sceneItemId, patch, origin);
  });
}

export function patchPendingUpload(
  projectId: string, userId: string, target: CollabTarget, itemId: string,
  expectedSrc: string, update: (item: ITrackItem) => ITrackItem,
): Promise<void> {
  const origin = `${userId}:upload-complete`;
  return patchRemoteDoc(projectId, userId, target, "patchPendingUpload", origin, schema => {
    const entry = schema.trackItems.get(itemId);
    if (!entry || entry.get("details")?.src !== expectedSrc) return;
    const item = update(entry.toJSON() as ITrackItem);
    schema.doc.transact(() => {
      for (const key of ["details", "metadata", "duration", "trim", "display"] as const) entry.set(key, item[key]);
      const duration = Math.max(0, ...Array.from(schema.trackItems.values()).map(value => value.get("display")?.to || 0));
      schema.meta.set("duration", duration);
    }, origin);
  });
}
