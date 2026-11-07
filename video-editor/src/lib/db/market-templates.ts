import { sql } from "kysely";
import { db } from "@/lib/db";
import { buildPublicUrl } from "@/lib/s3";

export type TemplateCollection = "discover" | "purchased" | "liked" | "saved";

export async function listMarketTemplates(accountId: string, userId: string, view: TemplateCollection, search: string, page: number, limit: number, projectId: string | null = null) {
  if (view === "purchased") {
    if (!projectId) return null;
    const member = await db.selectFrom("project_members as member")
      .innerJoin("projects as project", "project.project_id", "member.project_id")
      .where("member.project_id", "=", projectId).where("member.user_id", "=", userId)
      .where("member.deleted_at", "is", null).where("project.deleted_at", "is", null)
      .select("member.user_id").executeTakeFirst();
    if (!member) return null;
  }
  const collection = view === "purchased" ? sql`AND EXISTS (
    SELECT 1 FROM market_asset_licenses l WHERE l.market_asset_id = a.market_asset_id
    AND l.status = 'active' AND l.deleted_at IS NULL
    AND ((l.buyer_user_id = ${userId} AND l.project_id IS NULL) OR l.project_id = ${projectId})
  )` : view === "liked" ? sql`AND EXISTS (
    SELECT 1 FROM asset_likes l WHERE l.market_asset_id = a.market_asset_id AND l.account_id = ${accountId} AND l.deleted_at IS NULL
  )` : view === "saved" ? sql`AND EXISTS (
    SELECT 1 FROM asset_saves s WHERE s.market_asset_id = a.market_asset_id AND s.account_id = ${accountId} AND s.deleted_at IS NULL
  )` : sql``;
  const filter = sql`a.deleted_at IS NULL AND a.status = 'published'
    AND EXISTS (SELECT 1 FROM market_ydoc_assets t WHERE t.market_asset_id = a.market_asset_id)
    AND NOT EXISTS (SELECT 1 FROM market_media_assets m WHERE m.market_asset_id = a.market_asset_id)
    AND a.name ILIKE ${`%${search.replace(/[\\%_]/g, "\\$&")}%`} ${collection}`;
  const count = await sql<{ total: string }>`SELECT count(*) AS total FROM market_assets a WHERE ${filter}`.execute(db);
  const listings = await sql<{
    market_asset_id: string; name: string; description: string; price_credits: number;
    is_liked: boolean; is_saved: boolean; like_count: string; is_owner: boolean;
  }>`SELECT a.market_asset_id, a.name, a.description, a.price_credits,
    EXISTS (SELECT 1 FROM asset_likes l WHERE l.market_asset_id = a.market_asset_id AND l.account_id = ${accountId} AND l.deleted_at IS NULL) AS is_liked,
    EXISTS (SELECT 1 FROM asset_saves s WHERE s.market_asset_id = a.market_asset_id AND s.account_id = ${accountId} AND s.deleted_at IS NULL) AS is_saved,
    (SELECT count(*) FROM asset_likes l WHERE l.market_asset_id = a.market_asset_id AND l.deleted_at IS NULL) AS like_count,
    COALESCE((SELECT submitted_by_account_id = ${accountId} FROM marketplace_listings ml WHERE ml.market_asset_id = a.market_asset_id ORDER BY ml.created_at DESC, ml.listing_id DESC LIMIT 1), false) AS is_owner
    FROM market_assets a WHERE ${filter} ORDER BY a.created_at DESC, a.market_asset_id DESC
    LIMIT ${limit} OFFSET ${(page - 1) * limit}`.execute(db);
  const ids = listings.rows.map(row => row.market_asset_id);
  const images = ids.length ? await db.selectFrom("market_asset_thumbnails as link")
    .innerJoin("media_assets as media", "media.media_asset_id", "link.media_asset_id")
    .innerJoin("files as file", "file.file_id", "media.thumbnail_file_id")
    .select(["link.market_asset_id", "media.media_asset_id", "media.name", "media.width", "media.height", "file.path"])
    .where("link.market_asset_id", "in", ids).where("media.deleted_at", "is", null)
    .where("file.deleted_at", "is", null).where("file.path", "not like", "asset-originals/%")
    .where("file.mime_type", "like", "image/%").orderBy("link.position").execute() : [];
  const items = listings.rows.map(row => {
    const showcases = images.filter(image => image.market_asset_id === row.market_asset_id).map(image => ({
      id: image.media_asset_id, name: image.name, type: "image" as const,
      preview: buildPublicUrl(image.path), details: { src: buildPublicUrl(image.path), width: image.width ?? undefined, height: image.height ?? undefined },
    }));
    return {
      id: row.market_asset_id, marketAssetId: row.market_asset_id, name: row.name, description: row.description,
      type: "image" as const, price_credits: Number(row.price_credits), is_liked: row.is_liked, is_saved: row.is_saved,
      like_count: Number(row.like_count), is_owner: row.is_owner, showcases, assets: [],
      preview: showcases[0]?.preview, details: showcases[0]?.details,
      metadata: { market: true, market_asset_id: row.market_asset_id, price_credits: Number(row.price_credits) },
    };
  });
  const totalMediaCount = Number(count.rows[0]?.total || 0);
  return { items, page, totalMediaCount, hasMore: page * limit < totalMediaCount };
}
