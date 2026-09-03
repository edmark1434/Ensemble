// app/api/collab/projects/[id]/snapshots/[snapshotId]/route.ts

// Fetches one historical snapshot's raw bytes, exactly as stored — no
// merging with trailing yjs_updates. Scoped by project_id in the join so a
// snapshotId belonging to a different project 404s rather than leaking.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const { id: projectId, snapshotId: snapshotIdParam } = await params;

  const snapshotId = Number(snapshotIdParam);
  if (!Number.isFinite(snapshotId)) {
    return NextResponse.json({ error: "invalid snapshotId" }, { status: 400 });
  }

  try {
    const row = await db
      .selectFrom("project_yjs_snapshots")
      .innerJoin("yjs_snapshots", "yjs_snapshots.yjs_snapshot_id", "project_yjs_snapshots.yjs_snapshot_id")
      .where("project_yjs_snapshots.project_id", "=", projectId)
      .where("yjs_snapshots.yjs_snapshot_id", "=", snapshotId)
      .select(["yjs_snapshots.document"])
      .executeTakeFirst();

    if (!row) {
      return NextResponse.json(
        { error: `snapshot ${snapshotId} not found for this project` },
        { status: 404 }
      );
    }

    return new NextResponse(toArrayBuffer(row.document), {
      headers: { "Content-Type": "application/octet-stream" },
    });
  } catch (error) {
    console.error("[snapshot by id GET] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}