import * as Y from "yjs";
import { CollabSchema } from "./ydoc-schema";

const FLUSH_INTERVAL_MS = 3000;

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

// projectId/userId here are public_id strings — same values already sitting
// in useStore. Resolution to internal integer ids happens server-side.
export async function createSession(projectId: string, userId: string): Promise<number> {
  const res = await fetch("/api/collab/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, userId }),
  });
  if (!res.ok) throw new Error("Failed to create collab session");
  const data = await res.json();
  return data.sessionId as number;
}

export function endSession(sessionId: number): void {
  fetch(`/api/collab/sessions/${sessionId}`, { method: "PATCH" }).catch(() => {});
}

// No longer returns null — server always creates a blank snapshot on
// first access if none exists yet. Surfaces the real status + body on
// failure instead of a generic message, so genuine errors (project not
// found, DB failure) are visible instead of hidden.
export async function loadSnapshot(projectId: string): Promise<Uint8Array> {
  const res = await fetch(`/api/collab/projects/${projectId}/snapshot`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to load project snapshot (${res.status}): ${body}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export function attachPersistence(
  schema: CollabSchema,
  projectId: string,
  sessionId: number,
  localOrigin: unknown
): () => void {
  let pending: Uint8Array[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    flushTimer = null;
    if (pending.length === 0) return;

    const merged = pending.length === 1 ? pending[0] : Y.mergeUpdates(pending);
    pending = [];

    fetch(`/api/collab/projects/${projectId}/updates?sessionId=${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: toArrayBuffer(merged),
    }).catch((err) => {
      console.error("Failed to persist collab update", err);
    });
  };

  const handleUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin !== localOrigin) return;
    pending.push(update);
    if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
  };

  schema.doc.on("update", handleUpdate);

  return () => {
    schema.doc.off("update", handleUpdate);
    if (flushTimer) clearTimeout(flushTimer);
    flush();
  };
}