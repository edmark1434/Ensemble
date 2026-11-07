import { sql } from "kysely";
import { db } from "@/lib/db";

export async function readPublishedMarketTemplate(assetId: string) {
  const result = await sql<{ market_asset_id: string; name: string; snapshot_id: string; document: Buffer; created_at: Date; project_id: string | null }>`
    SELECT asset.market_asset_id, asset.name, snapshot.yjs_snapshot_id::text AS snapshot_id, snapshot.document,
           snapshot.created_at, source.project_id
    FROM market_assets asset
    JOIN market_ydoc_assets template ON template.market_asset_id = asset.market_asset_id
    JOIN yjs_snapshots snapshot ON snapshot.yjs_snapshot_id = template.yjs_snapshot_id
    LEFT JOIN project_yjs_snapshots source ON source.yjs_snapshot_id = snapshot.yjs_snapshot_id
    WHERE asset.market_asset_id = ${assetId} AND asset.status = 'published' AND asset.deleted_at IS NULL
  `.execute(db);
  return result.rows[0] || null;
}

export async function readTemplateSource(snapshotId: number) {
  const result = await sql<{ document: Buffer; created_at: Date; project_id: string }>`
    SELECT snapshot.document, snapshot.created_at, source.project_id
    FROM yjs_snapshots snapshot
    JOIN project_yjs_snapshots source ON source.yjs_snapshot_id = snapshot.yjs_snapshot_id
    JOIN market_ydoc_assets template ON template.yjs_snapshot_id = snapshot.yjs_snapshot_id
    WHERE snapshot.yjs_snapshot_id = ${snapshotId}`.execute(db);
  return result.rows[0];
}

export async function readTemplateMarketMedia(assetId: string, mediaId: string) {
  return db.selectFrom("market_media_assets as link")
    .innerJoin("market_assets as asset", "asset.market_asset_id", "link.market_asset_id")
    .innerJoin("media_assets as media", "media.media_asset_id", "link.media_asset_id")
    .innerJoin("files as proxy", "proxy.file_id", "media.proxy_file_id")
    .where("link.market_asset_id", "=", assetId).where("media.media_asset_id", "=", mediaId)
    .where("media.deleted_at", "is", null).where("proxy.deleted_at", "is", null)
    .select(["asset.price_credits", "proxy.path", "proxy.mime_type", "media.type", "media.original_file_id", "media.proxy_file_id"])
    .executeTakeFirst();
}

export async function readTemplateUpload(path: string, projectId: string) {
  return db.selectFrom("media_assets as media")
    .innerJoin("files as original", "original.file_id", "media.original_file_id")
    .leftJoin("files as proxy", "proxy.file_id", "media.proxy_file_id")
    .where(eb => eb.or([eb("original.path", "=", path), eb("proxy.path", "=", path)]))
    .where("media.deleted_at", "is", null).where("original.deleted_at", "is", null)
    .where(eb => eb.or([eb("media.project_id", "=", projectId), eb.exists(
      eb.selectFrom("project_members as member").select("member.user_id")
        .where("member.project_id", "=", projectId).whereRef("member.user_id", "=", "media.owner_user_id").where("member.deleted_at", "is", null))]))
    .where(eb => eb.not(eb.exists(eb.selectFrom("market_media_assets as link").select("link.market_asset_id")
      .whereRef("link.media_asset_id", "=", "media.media_asset_id"))))
    .select(["media.media_asset_id", "original.path"]).executeTakeFirst();
}
