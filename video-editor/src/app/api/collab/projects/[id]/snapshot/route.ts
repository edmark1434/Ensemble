// app/api/collab/projects/[id]/snapshot/route.ts

import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { db } from "@/lib/db";
import { resolveProjectId } from "@/utils/resolve-ids";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

async function createBlankSnapshot(projectId: number): Promise<Buffer> {
  const doc = new Y.Doc();
  const bytes = Buffer.from(Y.encodeStateAsUpdate(doc));
  doc.destroy();

  const newSnapshot = await db
    .insertInto("yjs_snapshots")
    .values({ document: bytes })
    .returning(["yjs_snapshot_id"])
    .executeTakeFirstOrThrow();

  await db
    .insertInto("project_yjs_snapshots")
    .values({ yjs_snapshot_id: newSnapshot.yjs_snapshot_id, project_id: projectId })
    .execute();

  return bytes;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let projectId: number;
  try {
    projectId = await resolveProjectId(id);
  } catch (error) {
    return NextResponse.json(
      { error: `project not found for public_id "${id}"` },
      { status: 404 }
    );
  }

  try {
    const row = await db
      .selectFrom("project_yjs_snapshots")
      .innerJoin("yjs_snapshots", "yjs_snapshots.yjs_snapshot_id", "project_yjs_snapshots.yjs_snapshot_id")
      .where("project_yjs_snapshots.project_id", "=", projectId)
      .orderBy("yjs_snapshots.created_at", "desc")
      .select(["yjs_snapshots.document"])
      .executeTakeFirst();

    // no snapshot yet — brand new project. Create and persist a blank one
    // now rather than returning 204, so every project always has exactly
    // one canonical snapshot row from first access onward.
    const documentBytes = row?.document ?? (await createBlankSnapshot(projectId));

    return new NextResponse(toArrayBuffer(documentBytes), {
      headers: { "Content-Type": "application/octet-stream" },
    });
  } catch (error) {
    console.error("[snapshot GET] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}