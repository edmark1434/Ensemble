import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Browser writes must originate in the editor, even when session cookies are sent.
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid asset ID." }, { status: 400 });
  const baseUrl = process.env.BACKEND_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!baseUrl || !secret) return NextResponse.json({ error: "Market actions are temporarily unavailable." }, { status: 503 });
  try {
    const body = await request.json();
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/assets/internal/editor/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": secret },
      body: JSON.stringify({ action: body.action, enabled: body.enabled, type: body.type, description: body.description, accountId: session.account_id }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Unable to update this asset. Please try again." }, { status: 502 });
  }
}
