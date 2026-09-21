// app/api/collab/projects/[id]/snapshots/route.ts

// Lists available snapshot checkpoints for a project, newest first.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { isProjectMember } from "@/lib/db/block-members";

export async function GET(
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
    const rows = await db
      .selectFrom("project_yjs_snapshots")
      .innerJoin("yjs_snapshots", "yjs_snapshots.yjs_snapshot_id", "project_yjs_snapshots.yjs_snapshot_id")
      .where("project_yjs_snapshots.project_id", "=", projectId)
      .orderBy("yjs_snapshots.created_at", "desc")
      .select(["yjs_snapshots.yjs_snapshot_id", "yjs_snapshots.created_at"])
      .execute();

    return NextResponse.json({
      snapshots: rows.map((r) => ({
        snapshotId: r.yjs_snapshot_id,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error("[snapshots GET] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}