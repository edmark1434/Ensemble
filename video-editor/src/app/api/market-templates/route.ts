import { NextRequest, NextResponse } from "next/server";
import { EDITOR_SESSION_COOKIE, verifyEditorSession } from "@/lib/auth/editor-session";
import { listMarketTemplates, type TemplateCollection } from "@/lib/db/market-templates";
import { MARKET_UUID } from "@/lib/market-asset-backend";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(EDITOR_SESSION_COOKIE)?.value;
  const session = token ? await verifyEditorSession(token) : null;
  if (!session) return NextResponse.json({ error: "Sign in to browse templates." }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const view = params.get("view") || "discover";
  if (!["discover", "purchased", "liked", "saved"].includes(view)) return NextResponse.json({ error: "Invalid collection." }, { status: 400 });
  const projectId = params.get("projectId");
  if (view === "purchased" && (!projectId || !MARKET_UUID.test(projectId))) return NextResponse.json({ error: "A valid project is required." }, { status: 400 });
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") || "20", 10) || 20));
  try {
    const result = await listMarketTemplates(session.account_id, session.userId, view as TemplateCollection, (params.get("query") || "").trim(), page, limit, projectId);
    if (!result) return NextResponse.json({ error: "Project access required." }, { status: 403 });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load templates." }, { status: 500 });
  }
}
