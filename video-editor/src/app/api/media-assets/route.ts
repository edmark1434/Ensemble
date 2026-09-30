// app/api/media-assets/route.ts

import { connection, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildPublicUrl } from "@/lib/s3";

type UploadScope = "mine" | "project" | "mine-in-project";
const VALID_SCOPES: UploadScope[] = ["mine", "project", "mine-in-project"];

const derivedUrl = (
  filePath: string | null,
  fileId: string | null,
  originalId: string
) => (filePath && fileId && fileId !== originalId ? buildPublicUrl(filePath) : undefined);

export async function GET(request: NextRequest) {
  await connection();

  const searchParams = new URL(request.url).searchParams;
  const projectId = searchParams.get("projectId");
  const userId = searchParams.get("userId");
  const scopeParam = searchParams.get("scope") as UploadScope | null;
  const scope: UploadScope =
    scopeParam && VALID_SCOPES.includes(scopeParam) ? scopeParam : "project";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  if ((scope === "mine" || scope === "mine-in-project") && !userId) {
    return NextResponse.json(
      { error: "userId is required for this scope" },
      { status: 400 }
    );
  }

  try {
    // projectId/userId from the query string are already the real
    // project_id / user_id UUIDs - no more public_id resolution.
    const ownerUserId = scope === "mine" || scope === "mine-in-project" ? userId! : null;

    let query = db
      .selectFrom("media_assets")
      .innerJoin("files", "files.file_id", "media_assets.original_file_id")
      .leftJoin("files as proxy_files", "proxy_files.file_id", "media_assets.proxy_file_id")
      .leftJoin("files as poster_files", "poster_files.file_id", "media_assets.thumbnail_file_id")
      .leftJoin("files as filmstrip_files", "filmstrip_files.file_id", "media_assets.filmstrip_file_id")
      .select([
        "media_assets.media_asset_id",
        "media_assets.name",
        "media_assets.type",
        "media_assets.width",
        "media_assets.height",
        "media_assets.duration_seconds",
        "media_assets.original_file_id",
        "media_assets.proxy_file_id",
        "media_assets.thumbnail_file_id",
        "media_assets.filmstrip_file_id",
        "files.path",
        "files.mime_type",
        "proxy_files.path as proxy_path",
        "poster_files.path as poster_path",
        "filmstrip_files.path as filmstrip_path"
      ])
      .where("media_assets.deleted_at", "is", null);

    // "mine" is deliberately not scoped to the current project - it's every
    // asset this user has ever uploaded, so they can pull assets in from
    // other projects.
    if (scope !== "mine") {
      query = query.where("media_assets.project_id", "=", projectId);
    }

    if (ownerUserId !== null) {
      query = query.where("media_assets.owner_user_id", "=", ownerUserId);
    }

    const rows = await query.orderBy("media_assets.created_at", "desc").execute();

    const uploads = rows.map((row) => {
      const filmstrip = derivedUrl(row.filmstrip_path, row.filmstrip_file_id, row.original_file_id);
      return {
        id: row.media_asset_id,
        fileName: row.name,
        type: row.type,
        url: buildPublicUrl(row.path),
        proxyUrl: derivedUrl(row.proxy_path, row.proxy_file_id, row.original_file_id),
        posterUrl: derivedUrl(row.poster_path, row.thumbnail_file_id, row.original_file_id),
        filmstripUrl: row.type === "video" ? filmstrip : undefined,
        waveformUrl: row.type === "audio" ? filmstrip : undefined,
        details: {
          width: row.width ?? undefined,
          height: row.height ?? undefined,
          duration: row.duration_seconds ?? undefined
        }
      };
    });

    return NextResponse.json({ uploads });
  } catch (error) {
    console.error("Error listing media assets:", error);
    return NextResponse.json(
      {
        error: "Failed to list media assets",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}