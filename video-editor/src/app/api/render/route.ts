import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { MARKET_UUID, marketAssetBackend } from "@/lib/market-asset-backend";
import { collectMarketExportItems } from "@/features/editor/utils/market-export-assets";

const RENDER_SERVER_URL = process.env.RENDER_SERVER_URL || "http://localhost:3001";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ message: "Sign in to export." }, { status: 401 });
  try {
    const body = await request.json();
    if (!Array.isArray(body?.trackItemIds) || !body?.trackItemsMap) return NextResponse.json({ message: "Invalid export." }, { status: 400 });
    const items = collectMarketExportItems(body);
    if (items.length && (!MARKET_UUID.test(body.projectId || "") || typeof body.marketDraft !== "boolean")) return NextResponse.json({ message: "Project and export mode are required." }, { status: 400 });
    const sources = new Map<string, string>();
    for (const item of items) {
      const metadata = item.metadata as { market_asset_id: string; media_asset_id: string };
      if (!MARKET_UUID.test(metadata.market_asset_id) || !MARKET_UUID.test(metadata.media_asset_id || "")) return NextResponse.json({ message: "Invalid marketplace asset." }, { status: 400 });
      const key = `${metadata.market_asset_id}:${metadata.media_asset_id}`;
      if (!sources.has(key)) {
        const result = await marketAssetBackend(request, metadata.market_asset_id, {
          action: "render-source", projectId: body.projectId, mediaAssetId: metadata.media_asset_id, draft: body.marketDraft,
        });
        if (result.status !== 200 || !result.data.sourceUrl) return NextResponse.json({ message: result.data.error || "Unable to prepare marketplace media." }, { status: result.status === 200 ? 502 : result.status });
        sources.set(key, result.data.sourceUrl);
      }
      // Only this job copy changes; protected URLs never enter project history.
      item.details.src = sources.get(key)!;
    }
    const response = await fetch(`${RENDER_SERVER_URL}/renders`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-user-id": session.userId },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Unable to prepare the export. Please try again." }, { status: 500 });
  }
}
