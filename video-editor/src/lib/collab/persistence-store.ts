// lib/collab/persistence-store.ts

// Server-side only. Distinct from src/features/editor/collab/persistence.ts,
// which is the client-side fetch helper — this one talks to Kysely directly
// and is shared by the Next API routes and the websocket server (same
// process, see server.ts).

import { db } from "@/lib/db";
import * as Y from "yjs";

export async function compactProject(projectId: string, extraUpdate?: Uint8Array): Promise<void> {
  const snapshotRow = await db
    .selectFrom("project_yjs_snapshots")
    .innerJoin("yjs_snapshots", "yjs_snapshots.yjs_snapshot_id", "project_yjs_snapshots.yjs_snapshot_id")
    .where("project_yjs_snapshots.project_id", "=", projectId)
    .orderBy("yjs_snapshots.created_at", "desc")
    .select(["yjs_snapshots.document"])
    .executeTakeFirst();

  const updateRows = await db
    .selectFrom("project_yjs_updates")
    .innerJoin("yjs_updates", "yjs_updates.yjs_update_id", "project_yjs_updates.yjs_update_id")
    .where("project_yjs_updates.project_id", "=", projectId)
    .orderBy("yjs_updates.created_at", "asc")
    .select(["yjs_updates.update", "project_yjs_updates.yjs_update_id"])
    .execute();

  if (!snapshotRow && updateRows.length === 0 && !extraUpdate) return;

  const doc = new Y.Doc({ gc: false });
  if (snapshotRow) Y.applyUpdate(doc, snapshotRow.document);
  for (const row of updateRows) Y.applyUpdate(doc, row.update);
  if (extraUpdate) Y.applyUpdate(doc, extraUpdate);

  const compacted = Buffer.from(Y.encodeStateAsUpdate(doc));

  // meta.duration is written in ms (see mirror-out.ts / ydoc-schema.ts);
  // projects.duration_seconds wants seconds. projectName maps to
  // projects.name; width/height come out of meta.size, not separate keys.
  const meta = doc.getMap("meta");
  const durationMs = meta.get("duration") as number | undefined;
  const durationSeconds =
    typeof durationMs === "number" ? Math.floor(durationMs / 1000) : undefined;
  const name = meta.get("projectName") as string | undefined;
  const size = meta.get("size") as { width?: number; height?: number } | undefined;
  const width = size?.width;
  const height = size?.height;

  doc.destroy();

  await db.transaction().execute(async (trx) => {
    const newSnapshot = await trx
      .insertInto("yjs_snapshots")
      .values({ document: compacted })
      .returning(["yjs_snapshot_id"])
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("project_yjs_snapshots")
      .values({ yjs_snapshot_id: newSnapshot.yjs_snapshot_id, project_id: projectId })
      .execute();

    type ProjectSync = Partial<{
      name: string;
      width: number;
      height: number;
      duration_seconds: number;
      updated_at: Date;
    }>;

    const projectUpdate: ProjectSync = {};
    if (typeof name === "string") projectUpdate.name = name;
    if (typeof width === "number") projectUpdate.width = width;
    if (typeof height === "number") projectUpdate.height = height;
    if (durationSeconds !== undefined) projectUpdate.duration_seconds = durationSeconds;

    if (Object.keys(projectUpdate).length > 0) {
      await trx
        .updateTable("projects")
        .set({ ...projectUpdate, updated_at: new Date() })
        .where("project_id", "=", projectId)
        .execute();
    }

    const idsToTrim = updateRows.map((r) => r.yjs_update_id);
    if (idsToTrim.length) {
      await trx.deleteFrom("project_yjs_updates").where("yjs_update_id", "in", idsToTrim).execute();
      await trx.deleteFrom("yjs_updates").where("yjs_update_id", "in", idsToTrim).execute();
    }
  });
}

export interface PersistedState {
  snapshot: Buffer | null;
  updates: Buffer[];
}

// compactProject always deletes exactly what it
// merges, in the same transaction that writes the new snapshot row, so
// no row it has processed is ever left behind. The periodic room-doc
// checkpoint (websocket/collab.ts) is a second snapshot writer that
// never deletes from yjs_updates at all — its snapshots can already
// include content some still-present update row also carries. Either
// way, "current state" is: newest snapshot + everything still on the
// table, safely re-applied — Yjs updates are idempotent, so replaying
// an update already folded into the snapshot is a no-op, not corruption.
// No timestamp filtering needed.
export async function loadLatestProjectState(projectId: string): Promise<PersistedState> {
  const snapshotRow = await db
    .selectFrom("project_yjs_snapshots")
    .innerJoin("yjs_snapshots", "yjs_snapshots.yjs_snapshot_id", "project_yjs_snapshots.yjs_snapshot_id")
    .where("project_yjs_snapshots.project_id", "=", projectId)
    .orderBy("yjs_snapshots.created_at", "desc")
    .select(["yjs_snapshots.document"])
    .executeTakeFirst();

  const updateRows = await db
    .selectFrom("project_yjs_updates")
    .innerJoin("yjs_updates", "yjs_updates.yjs_update_id", "project_yjs_updates.yjs_update_id")
    .where("project_yjs_updates.project_id", "=", projectId)
    .orderBy("yjs_updates.created_at", "asc")
    .select(["yjs_updates.update"])
    .execute();

  return {
    snapshot: snapshotRow?.document ?? null,
    updates: updateRows.map((r) => r.update),
  };
}