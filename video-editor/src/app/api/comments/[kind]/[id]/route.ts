import { NextRequest, NextResponse } from "next/server";
import {
  addComment,
  addReply,
  canModerateComments,
  getCommentRole,
  listComments,
  removeComment,
  removeReply,
} from "@/lib/db/comments";
import { broadcastComments } from "@/websocket/comments";
import type { CollabTarget } from "@/features/editor/collab/collab-target";
import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LEN = 4000;

type Ctx = { params: Promise<{ kind: string; id: string }> };

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

async function authorize(ctx: Ctx) {
  const { kind, id } = await ctx.params;
  if ((kind !== "projects" && kind !== "blocks") || !UUID.test(id)) {
    return { error: fail("bad request", 400) };
  }

  const sessionCookie = (await cookies()).get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;
  if (!decoded) return { error: fail("unauthorized", 401) };
  const userId = decoded.userId;

  const target: CollabTarget = { kind: kind === "projects" ? "project" : "block", id };
  const role = await getCommentRole(target, userId);
  if (!role) return { error: fail("forbidden", 403) };

  return { target, userId, role };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const a = await authorize(ctx);
  if ("error" in a) return a.error;
  return NextResponse.json(await listComments(a.target, a.userId, a.role));
}

// body: { body: string, parentId?: string }  (parentId present = it's a reply)
export async function POST(req: NextRequest, ctx: Ctx) {
  const a = await authorize(ctx);
  if ("error" in a) return a.error;
  if (a.role === "Viewer") return fail("forbidden", 403);

  const json = await req.json().catch(() => null);
  const text = typeof json?.body === "string" ? json.body.trim() : "";
  if (!text || text.length > MAX_LEN) return fail("bad request", 400);

  const parentId = json?.parentId;
  if (parentId != null) {
    if (typeof parentId !== "string" || !UUID.test(parentId)) return fail("bad request", 400);
    if (!(await addReply(a.target, parentId, a.userId, text))) return fail("not found", 404);
  } else {
    const t = json?.timeMs;
    if (t != null && (typeof t !== "number" || !Number.isFinite(t) || t < 0)) {
      return fail("bad request", 400);
    }
    await addComment(a.target, a.userId, text, t == null ? null : Math.round(t));
  }

  broadcastComments(a.target);
  return NextResponse.json({ ok: true });
}

// ?commentId=... or ?replyId=...
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const a = await authorize(ctx);
  if ("error" in a) return a.error;

  const commentId = req.nextUrl.searchParams.get("commentId");
  const replyId = req.nextUrl.searchParams.get("replyId");
  const targetId = commentId ?? replyId;
  if (!targetId || !UUID.test(targetId)) return fail("bad request", 400);

  const moderator = canModerateComments(a.role);
  const ok = commentId
    ? await removeComment(a.target, commentId, a.userId, moderator)
    : await removeReply(a.target, replyId!, a.userId, moderator);
  if (!ok) return fail("not found", 404);

  broadcastComments(a.target);
  return NextResponse.json({ ok: true });
}