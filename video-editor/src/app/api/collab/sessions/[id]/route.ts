// app/api/collab/sessions/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "invalid session id" }, { status: 400 });
  }

  await db
    .updateTable("sessions")
    .set({ disconnected_at: new Date() })
    .where("session_id", "=", sessionId)
    .execute();

  return NextResponse.json({ ok: true });
}