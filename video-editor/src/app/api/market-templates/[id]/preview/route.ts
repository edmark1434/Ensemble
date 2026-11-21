import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { getPublicOrigin } from "@/lib/auth/request-origin";
import { readPublishedMarketTemplate } from "@/lib/db/template-copy";
import { MARKET_UUID } from "@/lib/market-asset-backend";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to preview templates." }, { status: 401 });
  const { id } = await params;
  if (!MARKET_UUID.test(id)) return NextResponse.json({ error: "Invalid template." }, { status: 400 });
  const template = await readPublishedMarketTemplate(id);
  const origin = getPublicOrigin(request);
  if (!template) return NextResponse.redirect(new URL("/preview/unavailable", origin));
  return NextResponse.redirect(new URL(`/preview/${encodeURIComponent(template.market_asset_id)}`, origin), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
