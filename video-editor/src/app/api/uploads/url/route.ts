// app/api/uploads/url/route.ts

import {connection, NextRequest, NextResponse} from "next/server";
import { nanoid } from "nanoid";
import {
  buildPublicUrl,
  buildS3Key,
  getContentType,
  uploadBufferToS3
} from "@/lib/s3";
import { db } from "@/lib/db";
import { resolveUserIdByAccountPublicId, resolveProjectId } from "@/utils/resolve-ids";
import { probeAudioVideoDuration, probeImageDimensions } from "@/utils/media-probe";

interface UrlEntry {
  url: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

interface UploadUrlRequest {
  userId: string;
  projectId: string;
  urls: (string | UrlEntry)[];
}

export async function POST(request: NextRequest) {
  await connection();

  try {
    const body: UploadUrlRequest = await request.json();
    const { userId, projectId, urls } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "urls array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Backwards compatible: plain strings still work, but callers that
    // already know width/height/duration (e.g. the Pexels search results)
    // can pass them through and skip probing entirely.
    const entries: UrlEntry[] = urls.map((entry) =>
      typeof entry === "string" ? { url: entry } : entry
    );

    const [ownerUserId, resolvedProjectId] = await Promise.all([
      resolveUserIdByAccountPublicId(userId),
      resolveProjectId(projectId)
    ]);

    const results = await Promise.allSettled(
      entries.map(async ({ url: sourceUrl, width, height, durationSeconds }) => {
        const response = await fetch(sourceUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch ${sourceUrl}: ${response.status}`);
        }

        const contentType =
          response.headers.get("content-type") || getContentType(sourceUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const originalName =
          sourceUrl.split("/").pop()?.split("?")[0] || "file";
        const fileId = nanoid();
        const filePath = buildS3Key(userId, fileId, originalName);

        await uploadBufferToS3(filePath, buffer, contentType);

        let resolvedWidth = width ?? null;
        let resolvedHeight = height ?? null;
        let resolvedDuration = durationSeconds ?? null;

        if (
          contentType.startsWith("image/") &&
          (resolvedWidth == null || resolvedHeight == null)
        ) {
          const dims = await probeImageDimensions(buffer);
          resolvedWidth = resolvedWidth ?? dims.width;
          resolvedHeight = resolvedHeight ?? dims.height;
        }

        if (
          (contentType.startsWith("audio/") || contentType.startsWith("video/")) &&
          resolvedDuration == null
        ) {
          resolvedDuration = await probeAudioVideoDuration(buffer, contentType);
        }

        const file = await db
          .insertInto("files")
          .values({
            name: originalName,
            path: filePath,
            mime_type: contentType,
            size_bytes: arrayBuffer.byteLength
          })
          .returning("file_id")
          .executeTakeFirstOrThrow();

        const mediaAsset = await db
          .insertInto("media_assets")
          .values({
            public_id: nanoid(),
            owner_user_id: ownerUserId,
            project_id: resolvedProjectId,
            name: originalName,
            original_file_id: file.file_id,
            type: contentType.split("/")[0],
            width: resolvedWidth,
            height: resolvedHeight,
            duration_seconds: resolvedDuration
          })
          .returning(["media_asset_id", "public_id"])
          .executeTakeFirstOrThrow();

        return {
          fileName: originalName,
          filePath,
          contentType,
          originalUrl: sourceUrl,
          folder: "uploads",
          url: buildPublicUrl(filePath),
          mediaAssetId: mediaAsset.public_id,
          width: resolvedWidth,
          height: resolvedHeight,
          durationSeconds: resolvedDuration
        };
      })
    );

    const uploads = results
      .filter(
        (result): result is PromiseFulfilledResult<any> =>
          result.status === "fulfilled"
      )
      .map((result) => result.value);

    const failed = results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected"
      )
      .map((result) =>
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason)
      );

    return NextResponse.json({ success: true, uploads, failed });
  } catch (error) {
    console.error("Error in upload URL route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}