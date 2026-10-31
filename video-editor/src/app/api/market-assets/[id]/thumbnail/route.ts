import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { MARKET_UUID } from "@/lib/market-asset-backend";
import { getMarketVideoPreview } from "@/lib/market-video-preview-repository";
import { buildPublicUrl } from "@/lib/s3";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  if (!token || !await verifyEditorSession(token)) return NextResponse.json({}, { status: 401 });
  const { id } = await context.params;
  const mediaId = request.nextUrl.searchParams.get("mediaAssetId");
  if (!MARKET_UUID.test(id) || !mediaId || !MARKET_UUID.test(mediaId)) return NextResponse.json({}, { status: 400 });
  try {
    const path = await getMarketVideoPreview(id, mediaId);
    const url = path ? buildPublicUrl(path) : null;
    return NextResponse.json({ url }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({}, { status: 500 }); }
}
