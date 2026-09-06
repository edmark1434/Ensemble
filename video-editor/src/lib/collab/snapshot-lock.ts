// In-process mutex, keyed by projectId. Both the periodic room-doc
// checkpoint (websocket/collab.ts) and count-triggered compaction
// write new rows into
// yjs_snapshots/project_yjs_snapshots for the same project, and
// loadLatestProjectState always reads whichever snapshot row has the
// latest created_at. Without serialization, these two writers can
// interleave such that a snapshot built from older DB-only data ends up
// with a later timestamp than one built from newer room.doc state —
// silently shadowing the more-complete snapshot. Both writers run in the
// same Node process (see server.ts), so a plain in-memory lock is
// sufficient; this would need to move to something cross-process (e.g.
// a Postgres advisory lock) if these two ever ran on separate instances.
const locks = new Map<string, Promise<unknown>>();

export function withProjectSnapshotLock<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
  const prior = locks.get(projectId) ?? Promise.resolve();
  const result = prior.then(fn, fn); // run fn once prior settles, whichever way it settled

  // A failed attempt shouldn't wedge every future call behind a
  // permanently-rejected promise — store a version that swallows
  // rejection as the new "prior". The caller of *this* invocation still
  // gets the real `result`, rejection included.
  const settled = result.catch(() => {});
  locks.set(projectId, settled);
  settled.finally(() => {
    // Only clean up if nothing newer has chained onto this key since —
    // otherwise we'd delete a newer, still-pending chain.
    if (locks.get(projectId) === settled) locks.delete(projectId);
  });

  return result;
}