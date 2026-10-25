// app/api/uploads/complete/route.ts

import { connection, NextRequest, NextResponse } from "next/server";
import { buildPublicUrl } from "@/lib/s3";
import { createMediaUpload } from "@/lib/db/media-uploads";
import { prepareVideoUpload, discardVideoUpload, readUploadedFile } from "@/lib/video-upload";

export async function POST(request: NextRequest) {
  await connection();

  try {
    const {
      filePath,
      fileName,
      userId,
      projectId,
      width,
      height,
      durationSeconds
    } = await request.json();

    // Route by stored metadata, not a client-supplied type that could skip normalization.
    const { contentType, fileSize } = await readUploadedFile(userId, filePath);
    const isVideo = contentType.startsWith("video/");
    const upload = isVideo
      ? await prepareVideoUpload({ userId, filePath, fileName, contentType })
      : { filePath, fileName, contentType, fileSize, width, height, durationSeconds, url: buildPublicUrl(filePath) };
    let mediaAsset;
    try {
      mediaAsset = await createMediaUpload({ ...upload, userId, projectId });
    } catch (error) {
      if (isVideo) await discardVideoUpload(upload.filePath).catch(() => undefined);
      throw error;
    }
    // Only delete new staging objects; older clients may have uploaded to a
    // filename-based path that other saved items still reference.
    if (isVideo && filePath.startsWith(`uploads/${userId}/incoming/`)) {
      void discardVideoUpload(filePath).catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      mediaAsset: { id: mediaAsset.media_asset_id },
      upload: { ...upload, mediaAssetId: mediaAsset.media_asset_id }
    });
  } catch (error) {
    console.error("Error completing upload:", error);
    return NextResponse.json(
      {
        error: "Failed to complete upload"
      },
      { status: 500 }
    );
  }
}
