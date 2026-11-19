// Queue local checkpoint requests before acquiring a database connection.
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