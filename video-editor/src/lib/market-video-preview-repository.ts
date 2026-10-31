import { db } from "@/lib/db";

// Public, generated previews only. Never use the original or full proxy here.
export async function getMarketVideoPreview(assetId: string, mediaId: string) {
  const file = await db.selectFrom("market_media_assets as link")
    .innerJoin("market_assets as asset", "asset.market_asset_id", "link.market_asset_id")
    .innerJoin("media_assets as media", "media.media_asset_id", "link.media_asset_id")
    .innerJoin("files as preview", "preview.file_id", "media.thumbnail_file_id")
    .where("link.market_asset_id", "=", assetId).where("media.media_asset_id", "=", mediaId)
    .where("asset.deleted_at", "is", null).where("media.deleted_at", "is", null)
    .where("preview.deleted_at", "is", null).where("media.type", "=", "video")
    .where("preview.mime_type", "=", "video/mp4").select("preview.path").executeTakeFirst();
  if (!file?.path.startsWith("assets/thumbnails/video-5s-320/") || file.path.includes("..") || file.path.includes("\\")) return null;
  return file.path;
}
