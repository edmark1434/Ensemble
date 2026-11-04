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

export function readSceneAtSnapshot(blockId: string, projectId: string, capturedAt: Date) {
  return db.selectFrom("block_yjs_snapshots as source")
    .innerJoin("yjs_snapshots as snapshot", "snapshot.yjs_snapshot_id", "source.yjs_snapshot_id")
    .innerJoin("blocks as block", "block.block_id", "source.block_id")
    .select("snapshot.document")
    .where("block.block_id", "=", blockId).where("block.project_id", "=", projectId)
    .where("snapshot.created_at", "<=", capturedAt)
    .orderBy("snapshot.created_at", "desc").orderBy("snapshot.yjs_snapshot_id", "desc")
    .executeTakeFirst();
}
