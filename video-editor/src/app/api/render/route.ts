import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { isSameOriginRequest } from "@/lib/auth/request-origin";
import { submitRender } from "@/lib/submit-render";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ message: "Sign in to export." }, { status: 401 });
  try {
    const body = await request.json();
    delete body.portfolioFrameRange;
    return submitRender(request, session.userId, body);
  } catch {
    return NextResponse.json({ message: "Invalid export." }, { status: 400 });
  }
}
