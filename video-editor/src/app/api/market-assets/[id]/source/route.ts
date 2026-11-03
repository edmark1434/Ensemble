import { NextRequest, NextResponse } from "next/server";
import { MARKET_UUID } from "@/lib/market-asset-backend";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { getProjectMarketSource } from "@/lib/market-license-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { id } = await params;
  const projectId = request.nextUrl.searchParams.get("projectId");
  const mediaAssetId = request.nextUrl.searchParams.get("mediaAssetId");
  if (!MARKET_UUID.test(id) || !projectId || !MARKET_UUID.test(projectId) || !mediaAssetId || !MARKET_UUID.test(mediaAssetId)) {
    return NextResponse.json({ error: "Invalid project, asset or media ID." }, { status: 400 });
  }
  try {
    const source = await getProjectMarketSource(projectId, session.userId, id, mediaAssetId);
    if (source.status !== 200) return NextResponse.json({ error: source.error }, { status: source.status });
    return NextResponse.redirect(source.url, {
      status: 307,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load licensed media." }, { status: 502 });
  }
}
