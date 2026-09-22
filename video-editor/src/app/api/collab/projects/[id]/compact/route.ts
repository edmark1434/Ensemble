// app/api/collab/projects/[id]/compact/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { isProjectMember } from "@/lib/db/block-members";
import {compactProject, compactProjectAndScenes} from "@/lib/collab/persistence-store";
import { withProjectSnapshotLock } from "@/lib/collab/snapshot-lock";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EDITOR_SESSION_COOKIE)?.value;
  const decoded = sessionCookie ? await verifyEditorSession(sessionCookie) : null;
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  if (!(await isProjectMember(projectId, decoded.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await compactProjectAndScenes(projectId);
  } catch (error) {
    console.error("[compact POST] failed", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}