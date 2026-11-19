import { activeProjectIds } from "@/lib/db/project-availability";
// app/api/collab/projects/[id]/updates/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { canEditWithRole } from "@/features/editor/types/editor-role";
import { checkpointAfterUpdates } from "@/lib/collab/persistence-store";
import { isProjectFrozen } from "@/lib/db/projects";
import { canApplyCompositionUpdate } from "@/lib/collab/composition-size-policy";
import { COMPOSITION_SIZE_PLAN_MESSAGE } from "@/lib/composition-size-plan";

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
    .selectFrom("project_members").where("project_members.project_id", "in", activeProjectIds())
    .where("project_id", "=", projectId)
    .where("user_id", "=", decoded.userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();
  if (!membership || !canEditWithRole(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (await isProjectFrozen(projectId)) {
    return NextResponse.json({ error: "This project is frozen" }, { status: 403 });
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
    if (!(await canApplyCompositionUpdate(decoded.userId, { kind: "project", id: projectId }, buf))) {
      return NextResponse.json({ error: COMPOSITION_SIZE_PLAN_MESSAGE }, { status: 403 });
    }
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

  await checkpointAfterUpdates(projectId, { kind: "project", id: projectId });

  return NextResponse.json({ ok: true });
}
