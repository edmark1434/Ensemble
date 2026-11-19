import { sql } from "kysely";
import { db } from "@/lib/db";

export function readPreviewSnapshot(snapshotId: number, userId: string) {
  return db.selectFrom("yjs_snapshots as snapshot")
    .innerJoin("project_yjs_snapshots as source", "source.yjs_snapshot_id", "snapshot.yjs_snapshot_id")
    .innerJoin("projects as project", "project.project_id", "source.project_id")
    .innerJoin("project_members as member", "member.project_id", "project.project_id")
    .select(["snapshot.document", "snapshot.created_at", "project.project_id", "project.name"])
    .where("snapshot.yjs_snapshot_id", "=", snapshotId)
    .where("member.user_id", "=", userId).where("member.deleted_at", "is", null)
    .where("member.role", "in", ["Owner", "Manager"])
    .where("project.deleted_at", "is", null).executeTakeFirst();
}

// Compare both timestamps in PostgreSQL so a JS Date cannot round the cutoff.
export async function readSceneAtSnapshot(blockId: string, projectId: string, snapshotId: number | string) {
  const result = await sql<{ document: Buffer }>`
    SELECT s.document FROM project_yjs_snapshots root
     JOIN yjs_snapshots captured ON captured.yjs_snapshot_id = root.yjs_snapshot_id
     JOIN blocks b ON b.project_id = root.project_id AND b.block_id = ${blockId}
     JOIN block_yjs_snapshots link ON link.block_id = b.block_id
     JOIN yjs_snapshots s ON s.yjs_snapshot_id = link.yjs_snapshot_id
     WHERE root.project_id = ${projectId} AND root.yjs_snapshot_id = ${snapshotId}
       AND s.created_at <= captured.created_at
     ORDER BY s.created_at DESC, s.yjs_snapshot_id DESC LIMIT 1
  `.execute(db);
  return result.rows[0];
}
