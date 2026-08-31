// app/api/collab/projects/[id]/snapshots/latest/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { db } from "@/lib/db";
import { resolveProjectId } from "@/utils/resolve-ids";
import { loadLatestProjectState } from "@/lib/collab/persistence-store";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

async function createBlankSnapshot(projectId: number): Promise<Buffer> {
  const doc = new Y.Doc({ gc: false });
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
    const { snapshot, updates } = await loadLatestProjectState(projectId);

    let documentBytes: Buffer;
    if (!snapshot && updates.length === 0) {
      // brand new project — same "always create a canonical blank snapshot"
      // behavior as before
      documentBytes = await createBlankSnapshot(projectId);
    } else if (updates.length === 0) {
      // snapshot alone is already current, nothing trailing to merge
      documentBytes = snapshot!;
    } else {
      const doc = new Y.Doc({ gc: false });
      if (snapshot) Y.applyUpdate(doc, snapshot);
      for (const update of updates) Y.applyUpdate(doc, update);
      documentBytes = Buffer.from(Y.encodeStateAsUpdate(doc));
      doc.destroy();
    }

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