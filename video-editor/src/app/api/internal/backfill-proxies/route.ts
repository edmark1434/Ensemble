import { connection, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueueProxy, needsDerivatives } from "@/lib/create-proxy";

export async function GET(request: NextRequest) {
  await connection();

  const key = process.env.ADMIN_BACKFILL_KEY;
  if (!key || request.headers.get("x-admin-key") !== key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const limit = Math.min(
    Number(new URL(request.url).searchParams.get("limit")) || 20,
    200
  );

  const rows = await db
    .selectFrom("media_assets")
    .innerJoin("files", "files.file_id", "media_assets.original_file_id")
    .select([
      "media_assets.media_asset_id",
      "media_assets.type",
      "media_assets.original_file_id",
      "media_assets.proxy_file_id",
      "media_assets.thumbnail_file_id",
      "media_assets.filmstrip_file_id",
      "files.mime_type"
    ])
    .where("media_assets.deleted_at", "is", null)
    .execute();

  const pending = rows.filter(needsDerivatives);
  pending.slice(0, limit).forEach((r) => enqueueProxy(r.media_asset_id));

  return NextResponse.json({
    queued: Math.min(pending.length, limit),
    remaining: Math.max(pending.length - limit, 0)
  });
}