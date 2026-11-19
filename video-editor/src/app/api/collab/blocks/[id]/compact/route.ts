import { activeProjectIds } from "@/lib/db/project-availability";
// app/api/collab/blocks/[id]/compact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getBlockProjectId } from "@/lib/db/blocks";
import { compactProjectAndScenes } from "@/lib/collab/persistence-store";
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
  const projectId = await getBlockProjectId(blockId);
  if (!projectId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await db
    .selectFrom("project_members").where("project_members.project_id", "in", activeProjectIds())
    .where("project_id", "=", projectId)
    .where("user_id", "=", decoded.userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();
  if (!membership || membership.role === "Viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await compactProjectAndScenes(projectId);

  return NextResponse.json({ ok: true });
}