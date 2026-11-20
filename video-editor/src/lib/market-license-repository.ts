import { db } from "@/lib/db";

export async function readProjectMarketLicenses(projectId: string, userId: string, ids: string[]) {
  const member = await db.selectFrom("project_members as pm")
    .innerJoin("projects as p", "p.project_id", "pm.project_id")
    .where("pm.project_id", "=", projectId).where("pm.user_id", "=", userId)
    .where("pm.deleted_at", "is", null).where("p.deleted_at", "is", null)
    .where("p.trashed_at", "is", null)
    .select("pm.role").executeTakeFirst();
  if (!member) return null;
  if (!ids.length) return { assets: [], images: [], media: [] };
  const grants = db.selectFrom("market_assets as ma")
    .where("ma.market_asset_id", "in", ids)
    .select(["ma.deleted_at", "ma.trashed_at", "ma.status"])
    .select(["ma.market_asset_id as assetId", "ma.name", "ma.price_credits as priceCredits"])
    .select(eb => [
      eb.exists(eb.selectFrom("market_asset_licenses as license").select("license.market_asset_license_id")
        .whereRef("license.market_asset_id", "=", "ma.market_asset_id").where("license.project_id", "=", projectId)
        .where("license.status", "=", "active").where("license.deleted_at", "is", null)).as("licensed"),
      eb.exists(eb.selectFrom("market_asset_licenses as available").select("available.market_asset_license_id")
        .whereRef("available.market_asset_id", "=", "ma.market_asset_id").where("available.buyer_user_id", "=", userId)
        .where("available.project_id", "is", null).where("available.status", "=", "active")
        .where("available.deleted_at", "is", null)).as("canAssign"),
      eb.exists(eb.selectFrom(db.selectFrom("marketplace_listings").distinctOn("market_asset_id")
        .select(["market_asset_id", "submitted_by_account_id as account_id"])
        .orderBy("market_asset_id").orderBy("created_at", "desc").orderBy("listing_id", "desc").as("listing"))
        .innerJoin("users as creator", "creator.account_id", "listing.account_id")
        .select("listing.market_asset_id").whereRef("listing.market_asset_id", "=", "ma.market_asset_id")
        .where("creator.user_id", "=", userId)).as("isOwner"),
    ]).as("grants");
  const rows = await db.selectFrom(grants)
    .select(["assetId", "name", "priceCredits", "licensed", "isOwner", "canAssign", "trashed_at"])
    .where(eb => eb.or([
      eb("licensed", "=", true),
      eb.and([eb("deleted_at", "is", null), eb.or([
        eb("trashed_at", "is", null), eb("status", "=", "published"), eb("canAssign", "=", true), eb("isOwner", "=", true),
      ])]),
    ])).execute();
  const assets = rows.map(({ trashed_at, canAssign, ...asset }) => ({
    ...asset, trashed: !!trashed_at, draftOnly: !!trashed_at && !asset.licensed && !asset.isOwner && !canAssign,
  }));
  const licensedIds = assets.filter(asset => asset.licensed).map(asset => asset.assetId);
  const media = licensedIds.length ? await db.selectFrom("market_media_assets as link")
    .innerJoin("media_assets as media", "media.media_asset_id", "link.media_asset_id")
    .innerJoin("files as original", "original.file_id", "media.original_file_id")
    .where("link.market_asset_id", "in", licensedIds)
    .where("media.type", "in", ["image", "video", "audio"])
    .where("original.deleted_at", "is", null)
    .select(["link.market_asset_id as assetId", "media.media_asset_id as mediaAssetId",
      "media.type", "original.path", "original.mime_type as mimeType"])
    .execute() : [];
  return { assets, images: media.filter(file => file.type === "image"), media };
}
