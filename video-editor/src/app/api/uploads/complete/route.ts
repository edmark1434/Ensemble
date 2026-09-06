// app/api/uploads/complete/route.ts

import {connection, NextRequest, NextResponse} from "next/server";
import { db } from "@/lib/db";

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

    // userId/projectId are already the real user_id / project_id UUIDs —
    // no more public_id -> internal id resolution.
    const ownerUserId = userId;
    const resolvedProjectId = projectId;

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
      .returning("media_asset_id")
      .executeTakeFirstOrThrow();

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