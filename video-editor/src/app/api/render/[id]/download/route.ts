import { renderServerHeaders } from "@/lib/render-server";
import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL || "http://localhost:3001";

// Streams a finished export through the editor's own origin. Local-queue outputs
// are signed links on the internal render server (e.g. 127.0.0.1), which the
// browser cannot reach directly, and cross-origin links ignore the filename.
async function proxyOutput(request: NextRequest, params: Promise<{ id: string }>) {
  const { id } = await params;
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ message: "Sign in to continue." }, { status: 401 });
  if (!id) return NextResponse.json({ message: "id parameter is required" }, { status: 400 });

  try {
    // The render server checks job ownership against the session user.
    const renderHeaders = await renderServerHeaders(session.userId);
    const statusResponse = await fetch(`${RENDER_SERVER_URL}/renders/${encodeURIComponent(id)}`, {
      cache: "no-store",
      headers: renderHeaders,
    });
    const statusData = await statusResponse.json().catch(() => null);
    if (!statusResponse.ok || statusData?.status !== "completed" || typeof statusData?.videoUrl !== "string") {
      return NextResponse.json({ message: "This export is no longer available." }, { status: 410 });
    }

    const renderOrigin = new URL(RENDER_SERVER_URL).origin;
    const outputUrl = new URL(statusData.videoUrl, RENDER_SERVER_URL);
    if (outputUrl.protocol !== "https:" && outputUrl.protocol !== "http:") {
      return NextResponse.json({ message: "This export is no longer available." }, { status: 410 });
    }

    const upstream = await fetch(outputUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      cache: "no-store",
      // Internal credentials only ever go to the render server itself.
      headers: outputUrl.origin === renderOrigin ? renderHeaders : undefined,
    });
    if (!upstream.ok) {
      return NextResponse.json({ message: "This export is no longer available." }, { status: 410 });
    }

    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
      // No filename here: the same-origin download attribute names the file.
      "Content-Disposition": "attachment",
      "Cache-Control": "private, no-store",
    });
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);

    return new NextResponse(request.method === "HEAD" ? null : upstream.body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Render server unavailable" }, { status: 503 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return proxyOutput(request, params);
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return proxyOutput(request, params);
}
