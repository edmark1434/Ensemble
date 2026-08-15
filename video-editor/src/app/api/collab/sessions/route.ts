// app/api/collab/sessions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveProjectId, resolveUserIdByAccountPublicId } from "@/utils/resolve-ids";

export async function POST(request: NextRequest) {
  const { projectId, userId, socketId } = await request.json();

  if (!projectId || !userId) {
    return NextResponse.json({ error: "projectId and userId are required" }, { status: 400 });
  }

  try {
    const [resolvedProjectId, resolvedUserId] = await Promise.all([
      resolveProjectId(projectId),
      resolveUserIdByAccountPublicId(userId),
    ]);

    const session = await db
      .insertInto("sessions")
      .values({ project_id: resolvedProjectId, user_id: resolvedUserId, socket_id: socketId ?? null })
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