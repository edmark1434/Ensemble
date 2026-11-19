import { sql } from "kysely";
import { db } from "@/lib/db";
import { DEFAULT_GENERAL_ACCESS } from "@/features/editor/types/block-members";

export interface RestoredScene {
  sourceId: string;
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  document: string;
}

export async function listProjectSaves(projectId: string, before: string | null, limit: number) {
  const result = await sql<{
    save_id: string;
    is_initial: boolean;
    created_at: Date;
  }>`
    SELECT snapshot.yjs_snapshot_id::text AS save_id,
           snapshot.yjs_snapshot_id = (
             SELECT s.yjs_snapshot_id FROM project_yjs_snapshots p
             JOIN yjs_snapshots s USING (yjs_snapshot_id) WHERE p.project_id = ${projectId}
             ORDER BY s.created_at, s.yjs_snapshot_id LIMIT 1
           ) AS is_initial,
           snapshot.created_at
    FROM project_yjs_snapshots link
    JOIN yjs_snapshots snapshot USING (yjs_snapshot_id)
    WHERE link.project_id = ${projectId}
    AND (${before}::bigint IS NULL OR (snapshot.created_at, snapshot.yjs_snapshot_id) < (
      SELECT cursor.created_at, cursor.yjs_snapshot_id FROM yjs_snapshots cursor
      JOIN project_yjs_snapshots source USING (yjs_snapshot_id)
      WHERE cursor.yjs_snapshot_id = ${before}::bigint AND source.project_id = ${projectId}
    ))
    ORDER BY snapshot.created_at DESC, snapshot.yjs_snapshot_id DESC
    LIMIT ${limit + 1}
  `.execute(db);
  return { rows: result.rows.slice(0, limit), hasMore: result.rows.length > limit };
}

export async function readProjectSave(snapshotId: string) {
  const result = await sql<{ snapshot_id: string; project_id: string; created_at: Date; document: Buffer; name: string }>`
    SELECT snapshot.yjs_snapshot_id::text AS snapshot_id, link.project_id, snapshot.created_at, snapshot.document, project.name
    FROM project_yjs_snapshots link
    JOIN yjs_snapshots snapshot USING (yjs_snapshot_id)
    JOIN projects project ON project.project_id = link.project_id
    WHERE snapshot.yjs_snapshot_id = ${snapshotId}::bigint
      AND project.deleted_at IS NULL AND project.trashed_at IS NULL
  `.execute(db);
  return result.rows[0] ?? null;
}

// Applying a save gives every scene a fresh block (like a template), carrying
// over the original scene's sharing. Returns false when edit access is gone.
export async function insertRestoredScenes(projectId: string, userId: string, scenes: RestoredScene[]): Promise<boolean> {
  return db.transaction().execute(async trx => {
    const access = await sql<{ cursor_color: string }>`
      SELECT member.cursor_color FROM projects project
      JOIN project_members member ON member.project_id = project.project_id
      WHERE project.project_id = ${projectId} AND member.user_id = ${userId}
        AND member.role IN ('Owner', 'Manager', 'Editor') AND member.deleted_at IS NULL
        AND project.deleted_at IS NULL AND project.trashed_at IS NULL AND project.status <> 'frozen'
      FOR SHARE OF project, member
    `.execute(trx);
    if (!access.rows.length) return false;
    const cursorColor = access.rows[0].cursor_color || "#a1a1aa";

    for (const scene of scenes) {
      const source = await trx.selectFrom("blocks").select(["color_space", "general_access"])
        .where("block_id", "=", scene.sourceId).where("project_id", "=", projectId).executeTakeFirst();
      await trx.insertInto("blocks").values({
        block_id: scene.id,
        project_id: projectId,
        name: scene.name,
        resolution_width: scene.width,
        resolution_height: scene.height,
        color_space: source?.color_space || "RGB",
        frame_rate: scene.fps,
        general_access: source?.general_access || DEFAULT_GENERAL_ACCESS,
      }).execute();

      const members = source
        ? await trx.selectFrom("block_members").select(["user_id", "role", "cursor_color"])
          .where("block_id", "=", scene.sourceId).where("deleted_at", "is", null).execute()
        : [];
      // A scene always needs an owner; when the original one is gone, the person applying the save takes it.
      if (!members.some(member => member.role === "Owner")) {
        const self = members.find(member => member.user_id === userId);
        if (self) self.role = "Owner";
        else members.push({ user_id: userId, role: "Owner", cursor_color: cursorColor });
      }
      await trx.insertInto("block_members")
        .values(members.map(member => ({ block_id: scene.id, user_id: member.user_id, role: member.role, cursor_color: member.cursor_color })))
        .execute();

      const saved = await trx.insertInto("yjs_snapshots")
        .values({ document: Buffer.from(scene.document, "base64") })
        .returning("yjs_snapshot_id")
        .executeTakeFirstOrThrow();
      await trx.insertInto("block_yjs_snapshots")
        .values({ block_id: scene.id, yjs_snapshot_id: saved.yjs_snapshot_id })
        .execute();
    }
    return true;
  });
}
