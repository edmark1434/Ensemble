// app/api/collab/sessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { isProjectMember } from "@/lib/db/block-members";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // A userId in the body is ignored on purpose: the session is always
  // recorded for whoever is logged in, never for a client-supplied user.
  const body = await request.json().catch(() => null);
  const projectId = body?.projectId;
  const socketId = body?.socketId;

  if (typeof projectId !== "string" || !projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  // Any project role can open a session (viewers still load the editor).
  if (!(await isProjectMember(projectId, decoded.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const session = await db
      .insertInto("sessions")
      .values({ project_id: projectId, user_id: decoded.userId, socket_id: socketId ?? null })
      .returning(["session_id"])
      .executeTakeFirstOrThrow();

    return NextResponse.json({ sessionId: session.session_id });
  } catch (error) {
    console.error("[sessions POST] failed", error);
    return NextResponse.json({ error: "failed to create session" }, { status: 500 });
  }
}