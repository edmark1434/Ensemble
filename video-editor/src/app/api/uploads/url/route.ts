// app/api/uploads/url/route.ts

import { connection, NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  buildPublicUrl,
  buildS3Key,
  getContentType,
  uploadBufferToS3
} from "@/lib/s3";
import { createMediaUpload } from "@/lib/db/media-uploads";
import { prepareVideoUpload, discardVideoUpload } from "@/lib/video-upload";
import { probeAudioVideoDuration, probeImageDimensions } from "@/utils/media-probe";
import { resolveUniqueFileName } from "@/utils/resolve-unique-filename";
import { MAX_FILE_SIZE_BYTES } from "@/constants/upload-limits";

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

async function readBufferWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength && parseInt(declaredLength, 10) > maxBytes) {
    throw new Error(`Exceeds ${maxBytes} byte limit (content-length: ${declaredLength})`);
  }
  if (!response.body) {
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.byteLength > maxBytes) throw new Error(`Exceeds ${maxBytes} byte limit`);
    return buf;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Exceeds ${maxBytes} byte limit`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

const GENERIC_CONTENT_TYPES = new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "application/binary",
  ""
]);

function resolveContentType(headerType: string | null, url: string): string {
  const normalized = headerType?.split(";")[0].trim().toLowerCase() ?? "";
  if (headerType && !GENERIC_CONTENT_TYPES.has(normalized)) return normalized;
  return getContentType(new URL(url).pathname);
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
    // can pass them through for images/audio. Videos are always probed after normalization.
    const entries: UrlEntry[] = urls.map((entry) =>
      typeof entry === "string" ? { url: entry } : entry
    );

    // userId/projectId are already the real user_id / project_id UUIDs —
    // no more public_id -> internal id resolution.
    const ownerUserId = userId;
    const resolvedProjectId = projectId;

    const reservedInBatch = new Set<string>();
    const entriesWithNames = [];
    for (const entry of entries) {
      const original = entry.url.split("/").pop()?.split("?")[0] || "file";
      const fileName = await resolveUniqueFileName(
        ownerUserId,
        original,
        reservedInBatch
      );
      reservedInBatch.add(fileName);
      entriesWithNames.push({ ...entry, fileName });
    }

    const results = await Promise.allSettled(
      entriesWithNames.map(async ({ url: sourceUrl, width, height, durationSeconds, fileName }) => {
        const response = await fetch(sourceUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch ${sourceUrl}: ${response.status}`);
        }

        let contentType = resolveContentType(response.headers.get("content-type"), sourceUrl);
        const buffer = await readBufferWithLimit(response, MAX_FILE_SIZE_BYTES);

        const fileId = nanoid();
        let filePath = buildS3Key(userId, fileId, fileName);
        let fileSize = buffer.byteLength;
        let preparedVideo;

        let resolvedWidth = width ?? null;
        let resolvedHeight = height ?? null;
        let resolvedDuration = durationSeconds != null ? Math.round(durationSeconds) : null;

        if (contentType.startsWith("image/")) {
          if (resolvedWidth == null || resolvedHeight == null) {
            const dims = await probeImageDimensions(buffer);
            resolvedWidth = resolvedWidth ?? dims.width;
            resolvedHeight = resolvedHeight ?? dims.height;
          }

        } else if (contentType.startsWith("video/")) {
          preparedVideo = await prepareVideoUpload({ userId, fileName, contentType, buffer });
          filePath = preparedVideo.filePath;
          fileName = preparedVideo.fileName;
          contentType = preparedVideo.contentType;
          fileSize = preparedVideo.fileSize;
          resolvedWidth = preparedVideo.width;
          resolvedHeight = preparedVideo.height;
          resolvedDuration = preparedVideo.durationSeconds;

        } else if (contentType.startsWith("audio/") && resolvedDuration == null) {
          const probedDuration = await probeAudioVideoDuration(buffer, contentType);
          resolvedDuration = probedDuration != null ? Math.round(probedDuration) : null;
        }

        if (!preparedVideo) await uploadBufferToS3(filePath, buffer, contentType);
        let mediaAsset;
        try {
          mediaAsset = await createMediaUpload({
            userId: ownerUserId, projectId: resolvedProjectId,
            fileName, filePath, contentType, fileSize,
            width: resolvedWidth, height: resolvedHeight, durationSeconds: resolvedDuration
          });
        } catch (error) {
          if (preparedVideo) await discardVideoUpload(preparedVideo.filePath).catch(() => undefined);
          throw error;
        }

        return {
          fileName,
          filePath,
          contentType,
          fileSize,
          originalUrl: sourceUrl,
          folder: "uploads",
          url: buildPublicUrl(filePath),
          mediaAssetId: mediaAsset.media_asset_id,
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
