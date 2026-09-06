// app/api/collab/projects/[id]/compact/route.ts

import { NextRequest, NextResponse } from "next/server";
import { compactProject } from "@/lib/collab/persistence-store";
import { withProjectSnapshotLock } from "@/lib/collab/snapshot-lock";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  try {
    await withProjectSnapshotLock(projectId, () => compactProject(projectId));
  } catch (error) {
    console.error("[compact POST] failed", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}