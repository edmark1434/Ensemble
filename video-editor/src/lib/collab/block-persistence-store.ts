// lib/collab/block-persistence-store.ts

import { db } from "@/lib/db";

export async function loadLatestBlockState(blockId: string): Promise<{
  snapshot: Buffer | null;
  updates: Buffer[];
}> {
  const snapshotRow = await db
    .selectFrom("block_yjs_snapshots")
    .innerJoin("yjs_snapshots", "yjs_snapshots.yjs_snapshot_id", "block_yjs_snapshots.yjs_snapshot_id")
    .where("block_yjs_snapshots.block_id", "=", blockId)
    .orderBy("yjs_snapshots.created_at", "desc")
    .select(["yjs_snapshots.document", "yjs_snapshots.created_at"])
    .executeTakeFirst();

  let updatesQuery = db
    .selectFrom("block_yjs_updates")
    .innerJoin("yjs_updates", "yjs_updates.yjs_update_id", "block_yjs_updates.yjs_update_id")
    .where("block_yjs_updates.block_id", "=", blockId)
    .orderBy("yjs_updates.created_at", "asc")
    .select(["yjs_updates.update"]);

  if (snapshotRow) {
    updatesQuery = updatesQuery.where("yjs_updates.created_at", ">", snapshotRow.created_at);
  }

  const updateRows = await updatesQuery.execute();

  return {
    snapshot: snapshotRow?.document ?? null,
    updates: updateRows.map((r) => r.update),
  };
}

// Plain write — no lock here. Callers that need mutual exclusion (the
// periodic/compact path) wrap this with withBlockSnapshotLock themselves;
// locking inside would deadlock a caller that's already holding the lock.
export async function compactBlock(blockId: string, document: Buffer): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const snapshot = await trx
      .insertInto("yjs_snapshots")
      .values({ document })
      .returning(["yjs_snapshot_id"])
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("block_yjs_snapshots")
      .values({ yjs_snapshot_id: snapshot.yjs_snapshot_id, block_id: blockId })
      .execute();
  });
}

// Simple per-key mutex, scoped to blocks so this file doesn't need to know
// snapshot-lock.ts's internals. If that file already exports a generic
// key-based lock, swap this out for it instead.
const locks = new Map<string, Promise<unknown>>();

export function withBlockSnapshotLock<T>(blockId: string, fn: () => Promise<T>): Promise<T> {
  const key = `block:${blockId}`;
  const prior = locks.get(key) ?? Promise.resolve();
  const next = prior.then(fn, fn);
  locks.set(key, next.catch(() => {}));
  return next;
}