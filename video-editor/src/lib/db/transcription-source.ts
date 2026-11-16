import { db } from "@/lib/db";

// Resolve only public marketplace previews, never arbitrary private uploads.
export async function readMarketTranscriptionSource(proxyPath: string) {
  return db.selectFrom("media_assets as media")
    .innerJoin("files as proxy", "proxy.file_id", "media.proxy_file_id")
    .innerJoin("market_media_assets as link", "link.media_asset_id", "media.media_asset_id")
    .innerJoin("market_assets as asset", "asset.market_asset_id", "link.market_asset_id")
    .leftJoin("files as original", join => join
      .onRef("original.file_id", "=", "media.original_file_id")
      .on("original.deleted_at", "is", null))
    .where("proxy.path", "=", proxyPath)
    .where("proxy.deleted_at", "is", null)
    .where("media.deleted_at", "is", null)
    .where("media.trashed_at", "is", null)
    .where("media.type", "in", ["audio", "video"])
    .where("asset.deleted_at", "is", null)
    .where("asset.status", "=", "published")
    .whereRef("media.proxy_file_id", "!=", "media.original_file_id")
    .select(["original.path", "original.mime_type as mimeType", "media.type"])
    .executeTakeFirst();
}
