import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { isSameOriginRequest } from "@/lib/auth/request-origin";
import { prepareProjectSaveApply, ProjectSaveError, SAVE_UUID, savesUpgradeUrl } from "@/lib/project-saves";

const headers = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; saveId: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to apply saves." }, { status: 401, headers });
  const { id, saveId } = await params;
  if (!SAVE_UUID.test(id) || !SAVE_UUID.test(saveId)) {
    return NextResponse.json({ error: "Invalid project or save." }, { status: 400, headers });
  }
  try {
    const snapshot = await prepareProjectSaveApply(id, saveId, session.userId);
    return NextResponse.json({ snapshot }, { headers });
  } catch (error) {
    if (error instanceof ProjectSaveError) {
      return NextResponse.json({ error: error.message, code: error.code, upgradeUrl: error.code ? savesUpgradeUrl() : undefined },
        { status: error.status, headers });
    }
    console.error("[project save apply]", error);
    return NextResponse.json({ error: "Unable to prepare this save. Your project has not been changed. Try again." }, { status: 500, headers });
  }
}
