// app/api/uploads/complete/route.ts

import {connection, NextRequest, NextResponse} from "next/server";
import { nanoid } from "nanoid";
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

    const file = await db
      .insertInto("files")
      .values({
        name: fileName,
        path: filePath,
        mime_type: contentType,
        size_bytes: fileSize
      })
      .returning("file_id")
      .executeTakeFirstOrThrow();

    const mediaAsset = await db
      .insertInto("media_assets")
      .values({
        public_id: nanoid(),
        owner_user_id: ownerUserId,
        project_id: resolvedProjectId,
        name: fileName,
        original_file_id: file.file_id,
        proxy_file_id: file.file_id,
        thumbnail_file_id: file.file_id,
        type: contentType.split("/")[0],
        width: width ?? null,
        height: height ?? null,
        duration_seconds: durationSeconds ?? null
      })
      .returning(["media_asset_id", "public_id"])
      .executeTakeFirstOrThrow();

    return NextResponse.json({
      success: true,
      mediaAsset: { id: mediaAsset.public_id }
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