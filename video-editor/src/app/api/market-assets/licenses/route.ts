import { NextRequest, NextResponse } from "next/server";
import { getProjectMarketLicenses } from "@/lib/market-license-service";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { MARKET_UUID } from "@/lib/market-asset-backend";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const projectId = request.nextUrl.searchParams.get("projectId");
  const ids = [...new Set((request.nextUrl.searchParams.get("ids") || "").split(",").filter(Boolean))];
  if (!projectId || !MARKET_UUID.test(projectId) || ids.length > 100 || !ids.every(id => MARKET_UUID.test(id))) {
    return NextResponse.json({ error: "Invalid project or assets." }, { status: 400 });
  }
  try {
    const result = await getProjectMarketLicenses(projectId, session.userId, ids);
    if (!result) return NextResponse.json({ error: "Project access required." }, { status: 403 });
    return NextResponse.json({ assets: result.assets }, { headers: {
      "Cache-Control": "private, no-store", "Server-Timing": result.serverTiming,
    } });
  } catch {
    return NextResponse.json({ error: "Unable to load asset licenses." }, { status: 500 });
  }
}
