import { connection, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildPublicUrl } from "@/lib/s3";

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
      .innerJoin("market_media_assets as mma", "mma.market_asset_id", "ma.market_asset_id")
      .innerJoin("media_assets as m", "m.media_asset_id", "mma.media_asset_id")
      .innerJoin("files as orig", "orig.file_id", "m.original_file_id")
      .innerJoin("files as thumb", "thumb.file_id", "m.thumbnail_file_id")
      .innerJoin("users as u", "u.user_id", "m.owner_user_id")
      .where("ma.status", "=", "published")
      .where("ma.deleted_at", "is", null)
      .where("m.deleted_at", "is", null)
      .where("m.type", "=", type)
      .select([
        "ma.market_asset_id",
        "ma.name as market_name",
        "ma.price_credits",
        "m.media_asset_id",
        "m.width",
        "m.height",
        "m.duration_seconds",
        "orig.path as original_path",
        "thumb.path as thumbnail_path",
        "u.first_name",
        "u.last_name"
      ]);

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

    // limit + 1 so we know whether another page exists without a count query
    const rows = await query
      .orderBy("ma.created_at", "desc")
      .orderBy("m.media_asset_id")
      .limit(limit + 1)
      .offset((page - 1) * limit)
      .execute();

    const hasMore = rows.length > limit;

    const items = rows.slice(0, limit).map((row) => {
      const author = [row.first_name, row.last_name].filter(Boolean).join(" ");
      const src = buildPublicUrl(row.original_path);
      const preview = buildPublicUrl(row.thumbnail_path);

      const base = {
        id: `market_${row.market_asset_id}_${row.media_asset_id}`,
        name: row.market_name,
        type,
        metadata: {
          market: true,
          market_asset_id: row.market_asset_id,
          media_asset_id: row.media_asset_id,
          price_credits: row.price_credits,
          author
        }
      };

      if (type === "audio") {
        return {
          ...base,
          details: { src, duration: row.duration_seconds ?? undefined }
        };
      }

      return {
        ...base,
        preview,
        details: {
          src,
          width: row.width ?? undefined,
          height: row.height ?? undefined,
          ...(type === "video"
            ? { duration: row.duration_seconds ?? undefined }
            : {})
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