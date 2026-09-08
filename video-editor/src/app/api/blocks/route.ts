// app/api/blocks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createBlock } from "@/lib/db/blocks";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;

  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { blockId, projectId, name, width, height } = await req.json();

  if (typeof blockId !== "string" || typeof projectId !== "string") {
    return NextResponse.json({ error: "Invalid blockId/projectId" }, { status: 400 });
  }
  if (typeof name !== "string" || name.length === 0 || name.length > 50) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  if (typeof width !== "number" || width <= 0 || typeof height !== "number" || height <= 0) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }

  const membership = await db
    .selectFrom("project_members")
    .where("project_id", "=", projectId)
    .where("user_id", "=", decoded.userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();

  // if (!membership || membership.role === "Viewer") {
  //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // }

  await createBlock({ blockId, projectId, name, width, height });
  return NextResponse.json({ ok: true });
}