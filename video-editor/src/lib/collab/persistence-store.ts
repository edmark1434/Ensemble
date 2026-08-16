// lib/collab/persistence-store.ts
//
// Server-side only. Distinct from src/features/editor/collab/persistence.ts,
// which is the client-side fetch helper — this one talks to Kysely directly
// and is shared by the Next API routes and the websocket server (same
// process, see server.ts).
import { db } from "@/lib/db";

export interface PersistedState {
  snapshot: Buffer | null;
  updates: Buffer[];
}

// Any row still in yjs_updates for a project hasn't been merged into the
// latest snapshot yet — compactProject (updates/route.ts) always deletes
// exactly what it merges, in the same transaction that writes the new
// snapshot row. So "current state" is just: newest snapshot + everything
// still on the table. No timestamp filtering needed.
export async function loadLatestProjectState(projectId: number): Promise<PersistedState> {
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