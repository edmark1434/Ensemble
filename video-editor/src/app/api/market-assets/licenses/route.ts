import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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
    const member = await db.selectFrom("project_members as pm")
      .innerJoin("projects as p", "p.project_id", "pm.project_id")
      .where("pm.project_id", "=", projectId).where("pm.user_id", "=", session.userId)
      .where("pm.deleted_at", "is", null).where("p.deleted_at", "is", null).select("pm.role").executeTakeFirst();
    if (!member) return NextResponse.json({ error: "Project access required." }, { status: 403 });
    if (!ids.length) return NextResponse.json({ assets: [] });
    const assets = await db.selectFrom("market_assets as ma")
      .where("ma.market_asset_id", "in", ids).where("ma.deleted_at", "is", null)
      .select(["ma.market_asset_id as assetId", "ma.name", "ma.price_credits as priceCredits"])
      .select(eb => [
        eb.exists(eb.selectFrom("market_asset_licenses as license").select("license.market_asset_license_id")
          .whereRef("license.market_asset_id", "=", "ma.market_asset_id").where("license.project_id", "=", projectId)
          .where("license.status", "=", "active").where("license.deleted_at", "is", null)).as("licensed"),
        eb.exists(eb.selectFrom("market_media_assets as link").innerJoin("media_assets as media", "media.media_asset_id", "link.media_asset_id")
          .select("link.market_asset_id").whereRef("link.market_asset_id", "=", "ma.market_asset_id")
          .where("media.owner_user_id", "=", session.userId).where("media.deleted_at", "is", null)).as("isOwner"),
      ]).execute();
    return NextResponse.json({ assets }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load asset licenses." }, { status: 500 });
  }
}
