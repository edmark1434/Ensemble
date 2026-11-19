// app/api/collab/projects/[id]/snapshots/latest/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { isProjectMember } from "@/lib/db/block-members";
import { loadLatestProjectState, compactProjectAndScenes } from "@/lib/collab/persistence-store";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

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
    const { snapshot, updates } = await loadLatestProjectState(projectId);

    let documentBytes: Buffer;
    if (!snapshot && updates.length === 0) {
      documentBytes = (await compactProjectAndScenes(projectId)).document;
    } else if (updates.length === 0) {
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