import { connection, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildPublicUrl } from "@/lib/s3";
import { isGeneratedMarketProxy } from "@/lib/market-proxy";

const VALID_TYPES = ["image", "video", "audio"] as const;
type MarketType = (typeof VALID_TYPES)[number];
const MAX_LIMIT = 50;

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function GET(request: NextRequest) {
  await connection();

  const sp = new URL(request.url).searchParams;
  const type = sp.get("type") as MarketType | null;

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "type must be image, video or audio" },
      { status: 400 }
    );
  }

  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20)
  );
  const search = sp.get("query")?.trim();

  try {
    let query = db
      .selectFrom("market_assets as ma")
      .where("ma.status", "=", "published")
      .where("ma.deleted_at", "is", null)
      .select([
        "ma.market_asset_id",
        "ma.name as market_name",
        "ma.description",
        "ma.price_credits",
        "ma.created_at"
      ])
      .where((eb) =>
        eb.exists(
          eb
            .selectFrom("market_media_assets as filter_link")
            .innerJoin("media_assets as filter_media", "filter_media.media_asset_id", "filter_link.media_asset_id")
            .select("filter_link.market_asset_id")
            .whereRef("filter_link.market_asset_id", "=", "ma.market_asset_id")
            .where("filter_media.type", "=", type)
            .where("filter_media.deleted_at", "is", null)
        )
      );

    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      query = query.where((eb) =>
        eb.or([
          eb("ma.name", "ilike", pattern),
          eb("ma.description", "ilike", pattern),
          eb.exists(
            eb
              .selectFrom("market_asset_tags as mat")
              .innerJoin("tags as t", "t.tag_id", "mat.tag_id")
              .select("mat.tag_id")
              .whereRef("mat.market_asset_id", "=", "ma.market_asset_id")
              .where("mat.deleted_at", "is", null)
              .where("t.deleted_at", "is", null)
              .where("t.name", "ilike", pattern)
          )
        ])
      );
    }

    // Paginate listings rather than their linked media files.
    const rows = await query
      .orderBy("ma.created_at", "desc")
      .orderBy("ma.market_asset_id")
      .limit(limit + 1)
      .offset((page - 1) * limit)
      .execute();

    const hasMore = rows.length > limit;
    const listings = rows.slice(0, limit);
    const marketAssetIds = listings.map((row) => row.market_asset_id);

    if (marketAssetIds.length === 0) {
      return NextResponse.json({ items: [], page, hasMore });
    }

    const [contentRows, showcaseRows] = await Promise.all([
      db
        .selectFrom("market_media_assets as mma")
        .innerJoin("media_assets as m", "m.media_asset_id", "mma.media_asset_id")
        .innerJoin("files as orig", "orig.file_id", "m.original_file_id")
        .leftJoin("files as proxy", (join) => join
          .onRef("proxy.file_id", "=", "m.proxy_file_id")
          .on("proxy.deleted_at", "is", null))
        .leftJoin("files as thumb", (join) => join
          .onRef("thumb.file_id", "=", "m.thumbnail_file_id")
          .onRef("thumb.file_id", "!=", "m.original_file_id")
          .on("thumb.deleted_at", "is", null)
          .on("thumb.mime_type", "like", "image/%")
          .on("thumb.path", "not like", "asset-originals/%"))
        .innerJoin("users as u", "u.user_id", "m.owner_user_id")
        .where("mma.market_asset_id", "in", marketAssetIds)
        .where("m.deleted_at", "is", null)
        .where("orig.deleted_at", "is", null)
        .select([
          "mma.market_asset_id",
          "mma.position",
          "m.media_asset_id",
          "m.name as content_name",
          "m.type",
          "m.width",
          "m.height",
          "m.duration_seconds",
          "m.original_file_id",
          "proxy.file_id as proxy_file_id",
          "proxy.path as proxy_path",
          "proxy.mime_type as proxy_mime_type",
          "thumb.path as thumbnail_path",
          "u.first_name",
          "u.last_name"
        ])
        .orderBy("mma.position")
        .execute(),
      db
        .selectFrom("market_asset_thumbnails as mat")
        .innerJoin("media_assets as m", "m.media_asset_id", "mat.media_asset_id")
        .innerJoin("files as thumb", "thumb.file_id", "m.thumbnail_file_id")
        .where("mat.market_asset_id", "in", marketAssetIds)
        .where("m.deleted_at", "is", null)
        .where("thumb.deleted_at", "is", null)
        .where("thumb.path", "not like", "asset-originals/%")
        .select([
          "mat.market_asset_id",
          "mat.position",
          "m.media_asset_id",
          "m.name as content_name",
          "m.width",
          "m.height",
          "thumb.path as thumbnail_path"
        ])
        .orderBy("mat.position")
        .execute()
    ]);

    const contentByListing = new Map<string, typeof contentRows>();
    for (const row of contentRows) {
      const group = contentByListing.get(row.market_asset_id) ?? [];
      group.push(row);
      contentByListing.set(row.market_asset_id, group);
    }

    const showcaseByListing = new Map<string, typeof showcaseRows>();
    for (const row of showcaseRows) {
      const group = showcaseByListing.get(row.market_asset_id) ?? [];
      group.push(row);
      showcaseByListing.set(row.market_asset_id, group);
    }

    const items = listings.map((listing) => {
      const content = contentByListing.get(listing.market_asset_id) ?? [];
      const showcases = (showcaseByListing.get(listing.market_asset_id) ?? []).map((row) => ({
        id: row.media_asset_id,
        name: row.content_name,
        type: "image" as const,
        preview: buildPublicUrl(row.thumbnail_path),
        details: {
          src: buildPublicUrl(row.thumbnail_path),
          width: row.width ?? undefined,
          height: row.height ?? undefined
        },
        metadata: {
          market: true,
          market_asset_id: listing.market_asset_id,
          media_asset_id: row.media_asset_id,
          price_credits: listing.price_credits
        }
      }));
      const author = content[0]
        ? [content[0].first_name, content[0].last_name].filter(Boolean).join(" ")
        : "";
      const assets = content.map((row) => {
        const ready = isGeneratedMarketProxy(
          row.type, row.original_file_id, row.proxy_file_id,
          row.proxy_path, row.proxy_mime_type
        );
        const proxyUrl = ready ? buildPublicUrl(row.proxy_path!) : "";
        return {
          id: `market_${listing.market_asset_id}_${row.media_asset_id}`,
          name: row.content_name || listing.market_name,
          type: row.type as MarketType,
          proxyStatus: ready ? "ready" : "unavailable",
          preview: row.thumbnail_path
            ? buildPublicUrl(row.thumbnail_path)
            : row.type === "image"
              ? proxyUrl || undefined
              : undefined,
          details: {
            src: proxyUrl,
            width: row.width ?? undefined,
            height: row.height ?? undefined,
            duration: row.duration_seconds ?? undefined
          },
          metadata: {
            market: true,
            market_asset_id: listing.market_asset_id,
            media_asset_id: row.media_asset_id,
            price_credits: listing.price_credits,
            author
          }
        };
      });
      const contentCover = assets.find((asset) => asset.preview) ?? assets[0];
      const coverPreview = showcases[0]?.preview ?? contentCover?.preview;
      const coverDetails = showcases[0]
        ? showcases[0].details
        : contentCover?.details;

      return {
        id: `market_${listing.market_asset_id}`,
        marketAssetId: listing.market_asset_id,
        name: listing.market_name,
        description: listing.description,
        type,
        price_credits: listing.price_credits,
        preview: coverPreview,
        details: coverDetails,
        showcases,
        assets,
        metadata: {
          market: true,
          market_asset_id: listing.market_asset_id,
          price_credits: listing.price_credits,
          author
        }
      };
    });

    return NextResponse.json({ items, page, hasMore });
  } catch (error) {
    console.error("Error listing market assets:", error);
    return NextResponse.json(
      { error: "Failed to list market assets" },
      { status: 500 }
    );
  }
}
