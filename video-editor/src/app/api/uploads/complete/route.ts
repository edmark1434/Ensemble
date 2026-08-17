// app/api/uploads/complete/route.ts

import {connection, NextRequest, NextResponse} from "next/server";
import { db } from "@/lib/db";
import { resolveUserIdByAccountPublicId, resolveProjectId } from "@/utils/resolve-ids";

export async function POST(request: NextRequest) {
  await connection();

  try {
    const {
      filePath,
      fileName,
      contentType,
      fileSize,
      userId,
      projectId,
      width,
      height,
      durationSeconds
    } = await request.json();

    const [ownerUserId, resolvedProjectId] = await Promise.all([
      resolveUserIdByAccountPublicId(userId),
      resolveProjectId(projectId)
    ]);

    const mediaAsset = await db.transaction().execute(async (transaction) => {
      const file = await transaction
        .insertInto("files")
        .values({
          name: fileName,
          path: filePath,
          mime_type: contentType,
          size_bytes: fileSize
        })
        .returning("file_id")
        .executeTakeFirstOrThrow();

      const createdMediaAsset = await transaction
        .insertInto("media_assets")
        .values({
          owner_user_id: ownerUserId,
          project_id: resolvedProjectId,
          name: fileName,
          proxy_file_id: file.file_id,
          thumbnail_file_id: file.file_id,
          type: contentType.split("/")[0],
          width: width ?? null,
          height: height ?? null,
          duration_seconds: durationSeconds ?? null
        })
        .returning("media_asset_id")
        .executeTakeFirstOrThrow();

      await transaction
        .insertInto("media_asset_bundle_files")
        .values({
          media_asset_id: createdMediaAsset.media_asset_id,
          file_id: file.file_id,
          preview_file_id: file.file_id,
          position: 0
        })
        .execute();
      return createdMediaAsset;
    });

    return NextResponse.json({
      success: true,
      mediaAsset: { id: mediaAsset.media_asset_id }
    });
  } catch (error) {
    console.error("Error completing upload:", error);
    return NextResponse.json(
      {
        error: "Failed to complete upload",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
