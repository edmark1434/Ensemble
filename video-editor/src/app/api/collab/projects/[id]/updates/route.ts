// app/api/collab/projects/[id]/updates/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { canEditWithRole } from "@/features/editor/types/editor-role";
import { withProjectSnapshotLock } from "@/lib/collab/snapshot-lock";
import { compactProject } from "@/lib/collab/persistence-store";

const COMPACT_AFTER_UPDATE_COUNT = 200;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  const membership = await db
    .selectFrom("project_members")
    .where("project_id", "=", projectId)
    .where("user_id", "=", decoded.userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();
  if (!membership || !canEditWithRole(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessionId = Number(request.nextUrl.searchParams.get("sessionId"));
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "invalid sessionId" }, { status: 400 });
  }

  const buf = Buffer.from(await request.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "empty update body" }, { status: 400 });
  }

  try {
    await db.transaction().execute(async (trx) => {
      const activity = await trx
        .insertInto("session_activities")
        .values({ session_id: sessionId, type: "edit" })
        .returning(["session_activity_id"])
        .executeTakeFirstOrThrow();

      const update = await trx
        .insertInto("yjs_updates")
        .values({ session_activity_id: activity.session_activity_id, update: buf })
        .returning(["yjs_update_id"])
        .executeTakeFirstOrThrow();

      await trx
        .insertInto("project_yjs_updates")
        .values({ yjs_update_id: update.yjs_update_id, project_id: projectId })
        .execute();
    });
  } catch (error) {
    console.error("[updates POST] failed", error);
    const isMissingRef = (error as { code?: string })?.code === "23503";
    return NextResponse.json(
      { error: isMissingRef ? "project or session not found" : "internal error" },
      { status: isMissingRef ? 404 : 500 }
    );
  }

  const { count } = await db
    .selectFrom("project_yjs_updates")
    .where("project_id", "=", projectId)
    .select(db.fn.countAll().as("count"))
    .executeTakeFirstOrThrow();

  if (Number(count) >= COMPACT_AFTER_UPDATE_COUNT) {
    await withProjectSnapshotLock(projectId, () => compactProject(projectId));
  }

  return NextResponse.json({ ok: true });
}