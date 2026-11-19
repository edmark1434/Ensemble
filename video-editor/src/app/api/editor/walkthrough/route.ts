import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { isSameOriginRequest } from "@/lib/auth/request-origin";
import { claimEditorWalkthrough } from "@/lib/db/editor-walkthrough";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new NextResponse(null, { status: 403 });
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token && await verifyEditorSession(token);
  if (!session) return new NextResponse(null, { status: 401 });
  const part = request.nextUrl.searchParams.get("part") ?? "editor";
  if (part !== "editor" && part !== "workspace") return new NextResponse(null, { status: 400 });
  return NextResponse.json({ show: await claimEditorWalkthrough(session.userId, part) });
}
