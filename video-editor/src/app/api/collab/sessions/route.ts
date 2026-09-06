// app/api/collab/sessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { projectId, userId, socketId } = await request.json();

  if (!projectId || !userId) {
    return NextResponse.json({ error: "projectId and userId are required" }, { status: 400 });
  }

  try {
    const session = await db
      .insertInto("sessions")
      .values({ project_id: projectId, user_id: userId, socket_id: socketId ?? null })
      .returning(["session_id"])
      .executeTakeFirstOrThrow();

    return NextResponse.json({ sessionId: session.session_id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 404 }
    );
  }
}