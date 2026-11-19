import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { isSameOriginRequest } from "@/lib/auth/request-origin";
import { createProjectSave, listProjectSaves, ProjectSaveError, SAVE_UUID, isSaveId, savesUpgradeUrl } from "@/lib/project-saves";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof ProjectSaveError) {
    return NextResponse.json({ error: error.message, code: error.code, upgradeUrl: error.code ? savesUpgradeUrl() : undefined },
      { status: error.status, headers });
  }
  console.error("[project saves]", error);
  return NextResponse.json({ error: fallback }, { status: 500, headers });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to view saves." }, { status: 401, headers });
  const { id } = await params;
  const before = request.nextUrl.searchParams.get("before");
  if (!SAVE_UUID.test(id) || (before !== null && !isSaveId(before))) {
    return NextResponse.json({ error: "Invalid project or save." }, { status: 400, headers });
  }
  try {
    return NextResponse.json(await listProjectSaves(id, session.userId, before), { headers });
  } catch (error) {
    return errorResponse(error, "Unable to load saves. Please try again.");
  }
}

// The navbar save button: compacts the project and scene documents together.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to save." }, { status: 401, headers });
  const { id } = await params;
  if (!SAVE_UUID.test(id)) return NextResponse.json({ error: "Invalid project." }, { status: 400, headers });
  try {
    return NextResponse.json(await createProjectSave(id, session.userId), { headers });
  } catch (error) {
    return errorResponse(error, "Unable to save the project. Please try again.");
  }
}
