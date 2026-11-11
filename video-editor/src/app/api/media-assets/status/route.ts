import { activeProjectIds } from "@/lib/db/project-availability";
import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { db } from "@/lib/db";
import { missingUploadSources } from "@/lib/db/upload-usage";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  try {
    const { projectId, sources } = await request.json();
    if (
      !/^[0-9a-f-]{36}$/i.test(projectId || "") ||
      !Array.isArray(sources) ||
      sources.length > 100 ||
      sources.some((src) => typeof src !== "string" || src.length > 4096)
    )
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const member = await db
      .selectFrom("project_members").where("project_members.project_id", "in", activeProjectIds())
      .innerJoin("projects", "projects.project_id", "project_members.project_id")
      .select("projects.project_id")
      .where("projects.project_id", "=", projectId)
      .where("project_members.user_id", "=", session.userId)
      .where("project_members.deleted_at", "is", null)
      .where("projects.deleted_at", "is", null)
      .executeTakeFirst();
    if (!member) return NextResponse.json({ error: "Project unavailable." }, { status: 403 });
    return NextResponse.json(
      { missing: await missingUploadSources(sources) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Unable to check media." }, { status: 500 });
  }
}
