// app/api/projects/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateProject } from "@/lib/db/projects";
import { db } from "@/lib/db";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;

  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db
    .selectFrom("project_members")
    .where("project_id", "=", params.projectId)
    .where("user_id", "=", decoded.userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();

  // if (!membership || membership.role === "Viewer") {
  //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // }

  const { name, width, height } = await req.json();

  if (name !== undefined && typeof name !== "string") {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  if (width !== undefined && (typeof width !== "number" || width <= 0)) {
    return NextResponse.json({ error: "Invalid width" }, { status: 400 });
  }
  if (height !== undefined && (typeof height !== "number" || height <= 0)) {
    return NextResponse.json({ error: "Invalid height" }, { status: 400 });
  }

  await updateProject({ projectId: params.projectId, name, width, height });
  return NextResponse.json({ ok: true });
}