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
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to create collab session (${res.status}): ${body}`);
  }
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
  const res = await fetch(`/api/collab/projects/${projectId}/snapshots/latest`);
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

  const mergePending = (): Uint8Array | null => {
    if (pending.length === 0) return null;
    const merged = pending.length === 1 ? pending[0] : Y.mergeUpdates(pending);
    pending = [];
    return merged;
  };

  const flush = () => {
    flushTimer = null;
    const merged = mergePending();
    if (!merged) return;

    fetch(`/api/collab/projects/${projectId}/updates?sessionId=${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: toArrayBuffer(merged),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`persist failed: ${res.status}`);
      })
      .catch((err) => {
        console.error("Failed to persist collab update, requeuing", err);
        pending.unshift(merged); // put it back so the next flush retries it
        if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
      });
  };

  // Unlike fetch, sendBeacon is guaranteed by the browser to be sent even
  // as the page is being torn down — this is the case a plain fetch in
  // the unmount cleanup can miss on an actual tab close.
  const flushOnUnload = () => {
    const merged = mergePending();
    if (!merged) return;
    const blob = new Blob([toArrayBuffer(merged)], { type: "application/octet-stream" });
    const sent = navigator.sendBeacon(`/api/collab/projects/${projectId}/updates?sessionId=${sessionId}`, blob);
    if (!sent) {
      console.warn("sendBeacon dropped collab update on unload, payload too large", merged.byteLength);
    }
  };

  const handleUpdate = (
    update: Uint8Array,
    _origin: unknown,
    _doc: Y.Doc,
    transaction: Y.Transaction,
  ) => {
    if (!transaction.local) return; // skips remote sync + initial hydration only
    pending.push(update);
    if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
  };

  schema.doc.on("update", handleUpdate);
  window.addEventListener("pagehide", flushOnUnload);

  return () => {
    schema.doc.off("update", handleUpdate);
    window.removeEventListener("pagehide", flushOnUnload);
    if (flushTimer) clearTimeout(flushTimer);
    flush();
  };
}