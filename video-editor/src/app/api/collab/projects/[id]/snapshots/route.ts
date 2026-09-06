// app/api/collab/projects/[id]/snapshots/route.ts

// Lists available snapshot checkpoints for a project, newest first.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

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