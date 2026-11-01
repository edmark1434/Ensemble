import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { deleteUpload, restoreUpload } from "@/lib/upload-trash";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  try {
    const deleted = await deleteUpload(session.userId, id, request.nextUrl.searchParams.get("permanent") === "true");
    return deleted ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Upload not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Unable to delete upload." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (body?.action !== "restore") return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  try {
    const restored = await restoreUpload(session.userId, id);
    return restored ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Upload cannot be restored." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Unable to restore upload." }, { status: 500 });
  }
}
