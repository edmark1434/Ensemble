// lib/collab/block-persistence-store.ts

import { db } from "@/lib/db";
import * as Y from "yjs";

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

// Mirrors compactProject's merge-then-trim shape, but reads purely from
// Postgres — used by the project-level force-save cascade, which has no
// access to another client's live in-memory room doc for a block that
// isn't currently open by anyone. Also fixes the fact that compactBlock
// itself never trims block_yjs_updates, so those rows never got flushed
// unless someone force-saved while that specific block's room was open.
export async function compactBlockFromStorage(blockId: string): Promise<void> {
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
    .select(["yjs_updates.update", "yjs_updates.yjs_update_id"]);

  if (snapshotRow) {
    updatesQuery = updatesQuery.where("yjs_updates.created_at", ">", snapshotRow.created_at);
  }

  const updateRows = await updatesQuery.execute();
  if (!snapshotRow && updateRows.length === 0) return;

  const doc = new Y.Doc({ gc: false });
  if (snapshotRow) Y.applyUpdate(doc, snapshotRow.document);
  for (const row of updateRows) Y.applyUpdate(doc, row.update);
  const compacted = Buffer.from(Y.encodeStateAsUpdate(doc));
  doc.destroy();

  await db.transaction().execute(async (trx) => {
    const newSnapshot = await trx
      .insertInto("yjs_snapshots")
      .values({ document: compacted })
      .returning(["yjs_snapshot_id"])
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("block_yjs_snapshots")
      .values({ yjs_snapshot_id: newSnapshot.yjs_snapshot_id, block_id: blockId })
      .execute();

    const idsToTrim = updateRows.map((r) => r.yjs_update_id);
    if (idsToTrim.length) {
      await trx.deleteFrom("block_yjs_updates").where("yjs_update_id", "in", idsToTrim).execute();
      await trx.deleteFrom("yjs_updates").where("yjs_update_id", "in", idsToTrim).execute();
    }
  });
}