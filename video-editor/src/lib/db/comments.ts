// lib/db/comments.ts

import type { Kysely } from "kysely";
import { db as typedDb } from "@/lib/db";
import { resolveFileUrl } from "@/lib/file-url";
import { buildPublicUrl } from "@/lib/s3";
import { getEffectiveBlockRole } from "@/lib/db/block-members";
import { getProjectMemberRole } from "@/lib/db/project-members";
import type { BlockRole } from "@/features/editor/types/block-members";
import type { CollabTarget } from "@/features/editor/collab/collab-target";
import type {
  CommentAttachment,
  CommentPerson,
  CommentReply,
  CommentsPayload,
  CommentStatus,
  CommentThread,
} from "@/features/editor/types/comments";

const db = typedDb as unknown as Kysely<any>;

type Cfg = {
  comments: string;
  replies: string;
  parentKey: string;
  commentId: string;
  replyId: string;
  commentFiles: string;
  replyFiles: string;
};

const CFG: Record<CollabTarget["kind"], Cfg> = {
  project: {
    comments: "project_comments",
    replies: "project_replies",
    parentKey: "project_id",
    commentId: "project_comment_id",
    replyId: "project_reply_id",
    commentFiles: "project_comment_attachments",
    replyFiles: "project_reply_attachments",
  },
  block: {
    comments: "block_comments",
    replies: "block_replies",
    parentKey: "block_id",
    commentId: "block_comment_id",
    replyId: "block_reply_id",
    commentFiles: "block_comment_attachments",
    replyFiles: "block_reply_attachments",
  },
};

export const canModerateComments = (role: BlockRole) =>
  role === "Owner" || role === "Manager";

async function projectIdOf(target: CollabTarget): Promise<string | null> {
  if (target.kind === "project") return target.id;
  const block = await db
    .selectFrom("blocks")
    .where("block_id", "=", target.id)
    .where("deleted_at", "is", null)
    .select("project_id")
    .executeTakeFirst();
  return block?.project_id ?? null;
}

export async function getCommentRole(
  target: CollabTarget,
  userId: string,
): Promise<BlockRole | null> {
  if (target.kind === "project") return getProjectMemberRole(target.id, userId);

  const projectId = await projectIdOf(target);
  if (!projectId) return null;

  // same order as collab.ts resolveRoomAccess: project membership first
  if (!(await getProjectMemberRole(projectId, userId))) return null;

  return getEffectiveBlockRole(target.id, projectId, userId);
}

/** Everyone in the project, for the @mention menu. */
async function listPeople(target: CollabTarget): Promise<CommentPerson[]> {
  const projectId = await projectIdOf(target);
  if (!projectId) return [];

  const rows = await db
    .selectFrom("project_members as m")
    .innerJoin("users as u", "u.user_id", "m.user_id")
    .innerJoin("accounts as a", "a.account_id", "u.account_id")
    .leftJoin("files as f", (j) =>
      j.onRef("f.file_id", "=", "a.avatar_file_id").on("f.deleted_at", "is", null),
    )
    .where("m.project_id", "=", projectId)
    .where("m.deleted_at", "is", null)
    .select(["u.user_id", "u.first_name", "u.last_name", "f.path as avatar_path"])
    .orderBy("u.first_name")
    .execute();

  return rows.map((r: any) => ({
    userId: r.user_id,
    name: `${r.first_name} ${r.last_name}`.trim(),
    avatarUrl: resolveFileUrl(r.avatar_path),
  }));
}

async function loadAttachments(
  table: string,
  key: string,
  ids: string[],
): Promise<Map<string, CommentAttachment[]>> {
  const map = new Map<string, CommentAttachment[]>();
  if (!ids.length) return map;

  const rows = await db
    .selectFrom(`${table} as at`)
    .innerJoin("files as f", "f.file_id", "at.file_id")
    .where(`at.${key}`, "in", ids)
    .where("f.deleted_at", "is", null)
    .select([`at.${key} as owner_id`, "f.file_id", "f.name", "f.path", "f.mime_type"])
    .orderBy("at.index")
    .execute();

  for (const r of rows as any[]) {
    const list = map.get(r.owner_id) ?? [];
    list.push({
      id: r.file_id,
      url: buildPublicUrl(r.path),
      name: r.name,
      mimeType: r.mime_type,
    });
    map.set(r.owner_id, list);
  }
  return map;
}

export async function listComments(
  target: CollabTarget,
  viewerId: string,
  role: BlockRole,
): Promise<CommentsPayload> {
  const c = CFG[target.kind];
  const moderator = canModerateComments(role);

  const toItem = (r: any, files: Map<string, CommentAttachment[]>): CommentReply => ({
    id: r.id,
    authorName: `${r.first_name} ${r.last_name}`.trim(),
    avatarUrl: resolveFileUrl(r.avatar_path),
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
    canDelete: moderator || r.user_id === viewerId,
    attachments: files.get(r.id) ?? [],
  });

  const comments = await db
    .selectFrom(`${c.comments} as c`)
    .innerJoin("users as u", "u.user_id", "c.user_id")
    .innerJoin("accounts as a", "a.account_id", "u.account_id")
    .leftJoin("files as f", (j) =>
      j.onRef("f.file_id", "=", "a.avatar_file_id").on("f.deleted_at", "is", null),
    )
    .where(`c.${c.parentKey}`, "=", target.id)
    .where("c.deleted_at", "is", null)
    .select([
      `c.${c.commentId} as id`,
      "c.user_id",
      "c.comment as body",
      "c.time_ms",
      "c.status",
      "c.created_at",
      "u.first_name",
      "u.last_name",
      "f.path as avatar_path",
    ])
    .orderBy("c.created_at")
    .execute();

  const ids = comments.map((r: any) => r.id);
  const replies = ids.length
    ? await db
      .selectFrom(`${c.replies} as r`)
      .innerJoin("users as u", "u.user_id", "r.user_id")
      .innerJoin("accounts as a", "a.account_id", "u.account_id")
      .leftJoin("files as f", (j) =>
        j.onRef("f.file_id", "=", "a.avatar_file_id").on("f.deleted_at", "is", null),
      )
      .where(`r.${c.commentId}`, "in", ids)
      .where("r.deleted_at", "is", null)
      .select([
        `r.${c.replyId} as id`,
        `r.${c.commentId} as comment_id`,
        "r.user_id",
        "r.reply as body",
        "r.created_at",
        "u.first_name",
        "u.last_name",
        "f.path as avatar_path",
      ])
      .orderBy("r.created_at")
      .execute()
    : [];

  const [commentFiles, replyFiles, people] = await Promise.all([
    loadAttachments(c.commentFiles, c.commentId, ids),
    loadAttachments(c.replyFiles, c.replyId, (replies as any[]).map((r) => r.id)),
    listPeople(target),
  ]);

  const byComment = new Map<string, CommentReply[]>();
  for (const r of replies as any[]) {
    const list = byComment.get(r.comment_id) ?? [];
    list.push(toItem(r, replyFiles));
    byComment.set(r.comment_id, list);
  }

  const threads: CommentThread[] = comments.map((r: any) => ({
    ...toItem(r, commentFiles),
    timeMs: r.time_ms ?? null,
    status: (r.status ?? "open") as CommentStatus,
    replies: byComment.get(r.id) ?? [],
  }));

  return { canComment: role !== "Viewer", people, threads };
}

/** true when every id is a live image row in `files`. */
export async function allImageFilesExist(fileIds: string[]): Promise<boolean> {
  if (!fileIds.length) return true;
  const unique = [...new Set(fileIds)];
  const rows = await db
    .selectFrom("files")
    .where("file_id", "in", unique)
    .where("deleted_at", "is", null)
    .where("mime_type", "like", "image/%")
    .select("file_id")
    .execute();
  return rows.length === unique.length;
}

export async function addComment(
  target: CollabTarget,
  userId: string,
  body: string,
  timeMs: number | null = null,
  fileIds: string[] = [],
) {
  const c = CFG[target.kind];
  await db.transaction().execute(async (trx) => {
    const row = await trx
      .insertInto(c.comments)
      .values({ [c.parentKey]: target.id, user_id: userId, comment: body, time_ms: timeMs })
      .returning(c.commentId)
      .executeTakeFirstOrThrow();

    if (fileIds.length) {
      await trx
        .insertInto(c.commentFiles)
        .values(fileIds.map((file_id, index) => ({ [c.commentId]: row[c.commentId], file_id, index })))
        .execute();
    }
  });
}

/** false = the parent comment isn't in this project/block (or is deleted). */
export async function addReply(
  target: CollabTarget,
  commentId: string,
  userId: string,
  body: string,
  fileIds: string[] = [],
): Promise<boolean> {
  const c = CFG[target.kind];
  const parent = await db
    .selectFrom(c.comments)
    .where(c.commentId, "=", commentId)
    .where(c.parentKey, "=", target.id)
    .where("deleted_at", "is", null)
    .select(c.commentId)
    .executeTakeFirst();
  if (!parent) return false;

  await db.transaction().execute(async (trx) => {
    const row = await trx
      .insertInto(c.replies)
      .values({ [c.commentId]: commentId, user_id: userId, reply: body })
      .returning(c.replyId)
      .executeTakeFirstOrThrow();

    if (fileIds.length) {
      await trx
        .insertInto(c.replyFiles)
        .values(fileIds.map((file_id, index) => ({ [c.replyId]: row[c.replyId], file_id, index })))
        .execute();
    }
  });
  return true;
}

/** false = comment isn't in this project/block (or is deleted). */
export async function setCommentStatus(
  target: CollabTarget,
  commentId: string,
  userId: string,
  status: CommentStatus,
): Promise<boolean> {
  const c = CFG[target.kind];
  const resolved = status === "resolved";
  const res = await db
    .updateTable(c.comments)
    .set({
      status,
      resolved_at: resolved ? new Date() : null,
      resolved_by_user_id: resolved ? userId : null,
    })
    .where(c.commentId, "=", commentId)
    .where(c.parentKey, "=", target.id)
    .where("deleted_at", "is", null)
    .executeTakeFirst();
  return Number(res.numUpdatedRows) > 0;
}

export async function removeComment(
  target: CollabTarget,
  commentId: string,
  userId: string,
  moderator: boolean,
): Promise<boolean> {
  const c = CFG[target.kind];
  let q = db
    .updateTable(c.comments)
    .set({ deleted_at: new Date() })
    .where(c.commentId, "=", commentId)
    .where(c.parentKey, "=", target.id)
    .where("deleted_at", "is", null);
  if (!moderator) q = q.where("user_id", "=", userId);
  const res = await q.executeTakeFirst();
  return Number(res.numUpdatedRows) > 0;
}

export async function removeReply(
  target: CollabTarget,
  replyId: string,
  userId: string,
  moderator: boolean,
): Promise<boolean> {
  const c = CFG[target.kind];
  let q = db
    .updateTable(c.replies)
    .set({ deleted_at: new Date() })
    .where(c.replyId, "=", replyId)
    .where("deleted_at", "is", null)
    .where(
      c.commentId,
      "in",
      db.selectFrom(c.comments).where(c.parentKey, "=", target.id).select(c.commentId),
    );
  if (!moderator) q = q.where("user_id", "=", userId);
  const res = await q.executeTakeFirst();
  return Number(res.numUpdatedRows) > 0;
}