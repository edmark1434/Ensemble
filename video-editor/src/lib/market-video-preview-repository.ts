import { db } from "@/lib/db";

// Public, generated previews only. Never use the original or full proxy here.
function thumbnailQuery(assetId: string, mediaId: string) {
  return db.selectFrom("market_media_assets as link")
    .innerJoin("market_assets as asset", "asset.market_asset_id", "link.market_asset_id")
    .innerJoin("media_assets as media", "media.media_asset_id", "link.media_asset_id")
    .innerJoin("files as preview", "preview.file_id", "media.thumbnail_file_id")
    .where("link.market_asset_id", "=", assetId).where("media.media_asset_id", "=", mediaId)
    .where("asset.deleted_at", "is", null).where("media.deleted_at", "is", null)
    .where("preview.deleted_at", "is", null).select("preview.path");
}

export async function getMarketVideoPreview(assetId: string, mediaId: string) {
  const file = await thumbnailQuery(assetId, mediaId).where("media.type", "=", "video")
    .where("preview.mime_type", "=", "video/mp4").executeTakeFirst();
  if (!file || !/^assets\/thumbnails\/video-5s-(?:320|480)\//.test(file.path) || file.path.includes("..") || file.path.includes("\\")) return null;
  return file.path;
}

export async function getMarketImageThumbnail(assetId: string, mediaId: string) {
  const file = await thumbnailQuery(assetId, mediaId).where("media.type", "=", "image")
    .where("preview.mime_type", "like", "image/%").executeTakeFirst();
  if (!file || !/^assets\/thumbnails\/(?:320|640)(?:-anim)?\//.test(file.path) || file.path.includes("..") || file.path.includes("\\")) return null;
  return file.path;
}
