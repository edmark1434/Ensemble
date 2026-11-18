import { sql } from "kysely";
import { db } from "@/lib/db";
import { DEFAULT_GENERAL_ACCESS } from "@/features/editor/types/block-members";

export interface SavedSceneSnapshot {
  blockId: string;
  snapshotId: string;
}

export interface RestoredScene {
  sourceId: string;
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  document: string;
}

export async function listActiveProjectBlockIds(projectId: string): Promise<string[]> {
  const rows = await db.selectFrom("blocks").select("block_id")
    .where("project_id", "=", projectId).where("deleted_at", "is", null).execute();
  return rows.map(row => row.block_id);
}

// Records one save. When the newest save already holds byte-identical project
// and scene documents, that save is returned instead of listing a duplicate.
export async function insertProjectSave({ projectId, userId, snapshotId, scenes }: {
  projectId: string;
  userId: string;
  snapshotId: string;
  scenes: SavedSceneSnapshot[];
}): Promise<{ id: string; createdAt: Date; created: boolean }> {
  return db.transaction().execute(async trx => {
    // Serialize saves per project so two clicks can't both pass the duplicate check.
    await sql`SELECT pg_advisory_xact_lock(hashtext(${`project-save:${projectId}`}))`.execute(trx);

    const latest = await trx.selectFrom("project_saves")
      .select(["project_save_id", "yjs_snapshot_id", "created_at"])
      .where("project_id", "=", projectId)
      .orderBy("created_at", "desc").orderBy("project_save_id", "desc")
      .executeTakeFirst();
    if (latest) {
      const previousScenes = await trx.selectFrom("project_save_blocks")
        .select(["block_id", "yjs_snapshot_id"])
        .where("project_save_id", "=", latest.project_save_id)
        .execute();
      const previous = new Map(previousScenes.map(row => [row.block_id, String(row.yjs_snapshot_id)]));
      if (previous.size === scenes.length && scenes.every(scene => previous.has(scene.blockId))) {
        const oldIds = [String(latest.yjs_snapshot_id), ...scenes.map(scene => previous.get(scene.blockId)!)];
        const newIds = [snapshotId, ...scenes.map(scene => scene.snapshotId)];
        const compared = await sql<{ total: string; differing: string }>`
          SELECT COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE old_snapshot.document IS DISTINCT FROM new_snapshot.document) AS differing
          FROM unnest(${oldIds}::bigint[], ${newIds}::bigint[]) AS pair(old_id, new_id)
          JOIN yjs_snapshots old_snapshot ON old_snapshot.yjs_snapshot_id = pair.old_id
          JOIN yjs_snapshots new_snapshot ON new_snapshot.yjs_snapshot_id = pair.new_id
        `.execute(trx);
        const row = compared.rows[0];
        if (row && Number(row.total) === oldIds.length && Number(row.differing) === 0) {
          return { id: latest.project_save_id, createdAt: latest.created_at, created: false };
        }
      }
    }

    const save = await trx.insertInto("project_saves")
      .values({ project_id: projectId, yjs_snapshot_id: Number(snapshotId), created_by_user_id: userId })
      .returning(["project_save_id", "created_at"])
      .executeTakeFirstOrThrow();
    if (scenes.length) {
      await trx.insertInto("project_save_blocks")
        .values(scenes.map(scene => ({
          project_save_id: save.project_save_id,
          block_id: scene.blockId,
          yjs_snapshot_id: Number(scene.snapshotId),
        })))
        .execute();
    }
    return { id: save.project_save_id, createdAt: save.created_at, created: true };
  });
}

export async function listProjectSaves(projectId: string, before: string | null, limit: number) {
  const result = await sql<{
    project_save_id: string;
    created_at: Date;
    user_id: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_path: string | null;
  }>`
    SELECT save.project_save_id, save.created_at, author.user_id, author.first_name, author.last_name,
           avatar.path AS avatar_path
    FROM project_saves save
    LEFT JOIN users author ON author.user_id = save.created_by_user_id
    LEFT JOIN accounts account ON account.account_id = author.account_id
    LEFT JOIN files avatar ON avatar.file_id = account.avatar_file_id AND avatar.deleted_at IS NULL
    WHERE save.project_id = ${projectId}
      AND (${before}::uuid IS NULL OR (save.created_at, save.project_save_id) < (
        SELECT cursor.created_at, cursor.project_save_id FROM project_saves cursor
        WHERE cursor.project_save_id = ${before}::uuid AND cursor.project_id = ${projectId}
      ))
    ORDER BY save.created_at DESC, save.project_save_id DESC
    LIMIT ${limit + 1}
  `.execute(db);
  return { rows: result.rows.slice(0, limit), hasMore: result.rows.length > limit };
}

export async function readProjectSave(saveId: string) {
  const result = await sql<{ project_save_id: string; project_id: string; created_at: Date; document: Buffer; name: string }>`
    SELECT save.project_save_id, save.project_id, save.created_at, snapshot.document, project.name
    FROM project_saves save
    JOIN yjs_snapshots snapshot ON snapshot.yjs_snapshot_id = save.yjs_snapshot_id
    JOIN projects project ON project.project_id = save.project_id
    WHERE save.project_save_id = ${saveId}
      AND project.deleted_at IS NULL AND project.trashed_at IS NULL
  `.execute(db);
  return result.rows[0] ?? null;
}

export async function readProjectSaveScenes(saveId: string) {
  return db.selectFrom("project_save_blocks as saved")
    .innerJoin("yjs_snapshots as snapshot", "snapshot.yjs_snapshot_id", "saved.yjs_snapshot_id")
    .select(["saved.block_id", "snapshot.document"])
    .where("saved.project_save_id", "=", saveId)
    .execute();
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
