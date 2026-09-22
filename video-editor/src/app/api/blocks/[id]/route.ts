// app/api/blocks/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateBlock, getBlockProjectId } from "@/lib/db/blocks";
import { getEffectiveBlockRole } from "@/lib/db/block-members";
import { canEditWithRole } from "@/features/editor/types/editor-role";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;

  if (!decoded) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const projectId = await getBlockProjectId(id);
  if (!projectId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const role = await getEffectiveBlockRole(id, projectId, decoded.userId);
  if (!canEditWithRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  await updateBlock({ blockId: id, name, width, height });
  return NextResponse.json({ ok: true });
}