import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { getShareLinkIssuer } from "@/lib/db/project-share-links";
import { createTemplateSnapshot } from "@/lib/collab/template-snapshot";
import { db } from "@/lib/db";
import { isProjectFrozen } from "@/lib/db/projects";
import { getEffectiveBlockRole } from "@/lib/db/block-members";
import { canEditWithRole } from "@/features/editor/types/editor-role";
import { createSnapshotPreviewToken } from "@/lib/auth/snapshot-preview-token";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await cookies()).get(EDITOR_SESSION_COOKIE)?.value;
  const user = session ? await verifyEditorSession(session) : null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const blockId = req.nextUrl.searchParams.get("blockId");
  if (!UUID.test(id) || (blockId && !UUID.test(blockId))) return NextResponse.json({ error: "Invalid project or scene" }, { status: 400 });
  if (!(await getShareLinkIssuer(id, user.userId, "Viewer"))) {
    return NextResponse.json({ error: "Only owners and managers can share this project as a template" }, { status: 403 });
  }
  if (await isProjectFrozen(id)) {
    return NextResponse.json({ error: "This project is frozen" }, { status: 403 });
  }
  if (blockId && !canEditWithRole(await getEffectiveBlockRole(blockId, id, user.userId))) {
    return NextResponse.json({ error: "Return to the project timeline to share this template" }, { status: 403 });
  }
  const update = new Uint8Array(await req.arrayBuffer());
  if (!update.byteLength || update.byteLength > 32 * 1024 * 1024) {
    return NextResponse.json({ error: "The project snapshot is empty or too large" }, { status: 400 });
  }
  try {
    const snapshotId = await createTemplateSnapshot(id, blockId, update);
    if (!snapshotId) return NextResponse.json({ error: "Save this project before sharing it as a template" }, { status: 409 });
    const project = await db.selectFrom("projects").select("name").where("project_id", "=", id).executeTakeFirstOrThrow();
    const url = new URL("/assets/owned", process.env.MAIN_APP_URL || "http://localhost:5173");
    url.searchParams.set("templateSnapshot", snapshotId);
    url.searchParams.set("templatePreview", createSnapshotPreviewToken(snapshotId, user.userId));
    url.searchParams.set("templateName", project.name || "Untitled template");
    return NextResponse.json({ url: url.toString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not prepare the template. Please try again." }, { status: 500 });
  }
}
