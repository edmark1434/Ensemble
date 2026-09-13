// app/api/collab/blocks/[id]/snapshots/latest/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as Y from "yjs";
import { db } from "@/lib/db";
import { getBlockProjectId } from "@/lib/db/blocks";
import { loadLatestBlockState } from "@/lib/collab/block-persistence-store";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

export async function GET(
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
    .selectFrom("project_members")
    .where("project_id", "=", projectId)
    .where("user_id", "=", decoded.userId)
    .where("deleted_at", "is", null)
    .select(["role"])
    .executeTakeFirst();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { snapshot, updates } = await loadLatestBlockState(blockId);

  const doc = new Y.Doc({ gc: false });
  if (snapshot) Y.applyUpdate(doc, new Uint8Array(snapshot));
  for (const u of updates) Y.applyUpdate(doc, new Uint8Array(u));
  const merged = Y.encodeStateAsUpdate(doc);
  doc.destroy();

  return new NextResponse(Buffer.from(merged), {
    status: 200,
    headers: { "Content-Type": "application/octet-stream" },
  });
}