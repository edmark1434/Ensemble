import type { Kysely } from "kysely";
import { db as typedDb } from "@/lib/db";
import { resolveFileUrl } from "@/lib/file-url";
import { getEffectiveBlockRole } from "@/lib/db/block-members";
import { getProjectMemberRole } from "@/lib/db/project-members";
import type { BlockRole } from "@/features/editor/types/block-members";
import type { CollabTarget } from "@/features/editor/collab/collab-target";
import type {
  CommentReply,
  CommentsPayload,
  CommentThread,
} from "@/features/editor/types/comments";

const db = typedDb as unknown as Kysely<any>;

type Cfg = {
  comments: string;
  replies: string;
  parentKey: string;
  commentId: string;
  replyId: string;
};

const CFG: Record<CollabTarget["kind"], Cfg> = {
  project: {
    comments: "project_comments",
    replies: "project_replies",
    parentKey: "project_id",
    commentId: "project_comment_id",
    replyId: "project_reply_id",
  },
  block: {
    comments: "block_comments",
    replies: "block_replies",
    parentKey: "block_id",
    commentId: "block_comment_id",
    replyId: "block_reply_id",
  },
};

export const canModerateComments = (role: BlockRole) =>
  role === "Owner" || role === "Manager";

export async function getCommentRole(
  target: CollabTarget,
  userId: string,
): Promise<BlockRole | null> {
  if (target.kind === "project") return getProjectMemberRole(target.id, userId);

  const block = await db
    .selectFrom("blocks")
    .where("block_id", "=", target.id)
    .where("deleted_at", "is", null)
    .select("project_id")
    .executeTakeFirst();
  if (!block) return null;

  // same order as collab.ts resolveRoomAccess: project membership first
  if (!(await getProjectMemberRole(block.project_id, userId))) return null;

  return getEffectiveBlockRole(target.id, block.project_id, userId);
}

export async function listComments(
  target: CollabTarget,
  viewerId: string,
  role: BlockRole,
): Promise<CommentsPayload> {
  const c = CFG[target.kind];
  const moderator = canModerateComments(role);

  const toItem = (r: any): CommentReply => ({
    id: r.id,
    authorName: `${r.first_name} ${r.last_name}`.trim(),
    avatarUrl: resolveFileUrl(r.avatar_path),
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
    canDelete: moderator || r.user_id === viewerId,
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

  const byComment = new Map<string, CommentReply[]>();
  for (const r of replies as any[]) {
    const list = byComment.get(r.comment_id) ?? [];
    list.push(toItem(r));
    byComment.set(r.comment_id, list);
  }

  const threads: CommentThread[] = comments.map((r: any) => ({
    ...toItem(r),
    timeMs: r.time_ms ?? null,
    replies: byComment.get(r.id) ?? [],
  }));

  return { canComment: role !== "Viewer", threads };
}

export async function addComment(
  target: CollabTarget,
  userId: string,
  body: string,
  timeMs: number | null = null,
) {
  const c = CFG[target.kind];
  await db
    .insertInto(c.comments)
    .values({ [c.parentKey]: target.id, user_id: userId, comment: body, time_ms: timeMs })
    .execute();
}

/** false = the parent comment isn't in this project/block (or is deleted). */
export async function addReply(
  target: CollabTarget,
  commentId: string,
  userId: string,
  body: string,
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

  await db
    .insertInto(c.replies)
    .values({ [c.commentId]: commentId, user_id: userId, reply: body })
    .execute();
  return true;
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