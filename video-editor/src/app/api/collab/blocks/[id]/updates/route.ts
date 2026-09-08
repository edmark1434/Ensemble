// app/api/collab/blocks/[id]/updates/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getBlockProjectId } from "@/lib/db/blocks";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: blockId } = await params;
  const sessionId = Number(req.nextUrl.searchParams.get("sessionId"));
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
  }

  const projectId = await getBlockProjectId(blockId);
  if (!projectId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await db
    .selectFrom("project_members")
    .where("project_id", "=", projectId)
    .where("user_id", "=", decoded.userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();
  if (!membership || membership.role === "Viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = Buffer.from(await req.arrayBuffer());

  await db.transaction().execute(async (trx) => {
    const activity = await trx
      .insertInto("session_activities")
      .values({ session_id: sessionId, type: "edit" })
      .returning(["session_activity_id"])
      .executeTakeFirstOrThrow();

    const update = await trx
      .insertInto("yjs_updates")
      .values({ session_activity_id: activity.session_activity_id, update: body })
      .returning(["yjs_update_id"])
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("block_yjs_updates")
      .values({ yjs_update_id: update.yjs_update_id, block_id: blockId })
      .execute();
  });

  return new NextResponse(null, { status: 204 });
}