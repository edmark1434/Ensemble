// app/api/media-assets/route.ts

import {connection, NextRequest, NextResponse} from "next/server";
import { db } from "@/lib/db";
import { buildPublicUrl } from "@/lib/s3";
import { resolveProjectId } from "@/utils/resolve-ids";

export async function GET(request: NextRequest) {
  await connection();

  const projectPublicId = new URL(request.url).searchParams.get("projectId");
  if (!projectPublicId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
    const projectId = await resolveProjectId(projectPublicId);

    const rows = await db
      .selectFrom("media_assets")
      .innerJoin("files", "files.file_id", "media_assets.original_file_id")
      .select([
        "media_assets.public_id",
        "media_assets.name",
        "media_assets.type",
        "media_assets.width",
        "media_assets.height",
        "media_assets.duration_seconds",
        "files.path",
        "files.mime_type"
      ])
      .where("media_assets.project_id", "=", projectId)
      .where("media_assets.deleted_at", "is", null)
      .orderBy("media_assets.created_at", "desc")
      .execute();

    const uploads = rows.map((row) => ({
      id: row.public_id,
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