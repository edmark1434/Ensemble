// app/api/media-assets/route.ts

import { connection, NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildPublicUrl } from "@/lib/s3";
import { resolveProjectId, resolveUserIdByAccountPublicId } from "@/utils/resolve-ids";

type UploadScope = "mine" | "project" | "mine-in-project";
const VALID_SCOPES: UploadScope[] = ["mine", "project", "mine-in-project"];

export async function GET(request: NextRequest) {
  await connection();

  const searchParams = new URL(request.url).searchParams;
  const projectPublicId = searchParams.get("projectId");
  const userPublicId = searchParams.get("userId");
  const scopeParam = searchParams.get("scope") as UploadScope | null;
  const scope: UploadScope =
    scopeParam && VALID_SCOPES.includes(scopeParam) ? scopeParam : "project";

  if (!projectPublicId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  if ((scope === "mine" || scope === "mine-in-project") && !userPublicId) {
    return NextResponse.json(
      { error: "userId is required for this scope" },
      { status: 400 }
    );
  }

  try {
    const projectId = await resolveProjectId(projectPublicId);
    const ownerUserId =
      scope === "mine" || scope === "mine-in-project"
        ? await resolveUserIdByAccountPublicId(userPublicId!)
        : null;

    let query = db
      .selectFrom("media_assets")
      .innerJoin("media_asset_bundle_files", (join) => join
        .onRef("media_asset_bundle_files.media_asset_id", "=", "media_assets.media_asset_id")
        .on("media_asset_bundle_files.position", "=", 0)
        .on("media_asset_bundle_files.deleted_at", "is", null))
      .innerJoin("files", "files.file_id", "media_asset_bundle_files.file_id")
      .select([
        "media_assets.media_asset_id",
        "media_assets.name",
        "media_assets.type",
        "media_assets.width",
        "media_assets.height",
        "media_assets.duration_seconds",
        "files.path",
        "files.mime_type"
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

    const uploads = rows.map((row) => ({
      id: row.media_asset_id,
      fileName: row.name,
      type: row.type,
      url: buildPublicUrl(row.path),
      details: {
        width: row.width ?? undefined,
        height: row.height ?? undefined,
        duration: row.duration_seconds ?? undefined
      }
    }));

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
