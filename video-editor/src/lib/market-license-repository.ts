import { db } from "@/lib/db";

export async function readProjectMarketLicenses(projectId: string, userId: string, ids: string[]) {
  const member = await db.selectFrom("project_members as pm")
    .innerJoin("projects as p", "p.project_id", "pm.project_id")
    .where("pm.project_id", "=", projectId).where("pm.user_id", "=", userId)
    .where("pm.deleted_at", "is", null).where("p.deleted_at", "is", null)
    .select("pm.role").executeTakeFirst();
  if (!member) return null;
  if (!ids.length) return { assets: [], images: [], media: [] };
  const assets = await db.selectFrom("market_assets as ma")
    .where("ma.market_asset_id", "in", ids).where("ma.deleted_at", "is", null)
    .select(["ma.market_asset_id as assetId", "ma.name", "ma.price_credits as priceCredits"])
    .select(eb => [
      eb.exists(eb.selectFrom("market_asset_licenses as license").select("license.market_asset_license_id")
        .whereRef("license.market_asset_id", "=", "ma.market_asset_id").where("license.project_id", "=", projectId)
        .where("license.status", "=", "active").where("license.deleted_at", "is", null)).as("licensed"),
      eb.exists(eb.selectFrom("market_media_assets as link").innerJoin("media_assets as media", "media.media_asset_id", "link.media_asset_id")
        .select("link.market_asset_id").whereRef("link.market_asset_id", "=", "ma.market_asset_id")
        .where("media.owner_user_id", "=", userId).where("media.deleted_at", "is", null)).as("isOwner"),
    ]).execute();
  const licensedIds = assets.filter(asset => asset.licensed).map(asset => asset.assetId);
  const media = licensedIds.length ? await db.selectFrom("market_media_assets as link")
    .innerJoin("media_assets as media", "media.media_asset_id", "link.media_asset_id")
    .innerJoin("files as original", "original.file_id", "media.original_file_id")
    .where("link.market_asset_id", "in", licensedIds)
    .where("media.type", "in", ["image", "video", "audio"]).where("media.deleted_at", "is", null)
    .where("original.deleted_at", "is", null)
    .select(["link.market_asset_id as assetId", "media.media_asset_id as mediaAssetId",
      "media.type", "original.path", "original.mime_type as mimeType"])
    .execute() : [];
  return { assets, images: media.filter(file => file.type === "image"), media };
}
