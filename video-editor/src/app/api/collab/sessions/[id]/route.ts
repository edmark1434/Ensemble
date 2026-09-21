// app/api/collab/sessions/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "invalid session id" }, { status: 400 });
  }

  // Only a session's own user can end it. Someone else's id just matches no rows.
  await db
    .updateTable("sessions")
    .set({ disconnected_at: new Date() })
    .where("session_id", "=", sessionId)
    .where("user_id", "=", decoded.userId)
    .execute();

  return NextResponse.json({ ok: true });
}