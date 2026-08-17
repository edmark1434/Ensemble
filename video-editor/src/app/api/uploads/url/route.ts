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
import {probeAudioVideoDuration, probeImageDimensions, probeVideoMetadata} from "@/utils/media-probe";
import { resolveUniqueFileName } from "@/utils/resolve-unique-filename";
import {MAX_FILE_SIZE_BYTES} from "@/constants/upload-limits";

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
  if (headerType && !GENERIC_CONTENT_TYPES.has(normalized)) return headerType;
  return getContentType(url);
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

        const contentType = resolveContentType(response.headers.get("content-type"), sourceUrl);
        const buffer = await readBufferWithLimit(response, MAX_FILE_SIZE_BYTES);

        const fileId = nanoid();
        const filePath = buildS3Key(userId, fileId, fileName);

        await uploadBufferToS3(filePath, buffer, contentType);

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
          if (resolvedWidth == null || resolvedHeight == null || resolvedDuration == null) {
            const probed = await probeVideoMetadata(buffer, contentType);
            resolvedWidth = resolvedWidth ?? probed.width;
            resolvedHeight = resolvedHeight ?? probed.height;
            resolvedDuration = resolvedDuration ?? probed.durationSeconds;
          }

        } else if (contentType.startsWith("audio/") && resolvedDuration == null) {
          const probedDuration = await probeAudioVideoDuration(buffer, contentType);
          resolvedDuration = probedDuration != null ? Math.round(probedDuration) : null;
        }

        const mediaAsset = await db.transaction().execute(async (transaction) => {
          const file = await transaction
            .insertInto("files")
            .values({
              name: fileName,
              path: filePath,
              mime_type: contentType,
              size_bytes: buffer.byteLength
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
              width: resolvedWidth,
              height: resolvedHeight,
              duration_seconds: resolvedDuration
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

        return {
          fileName,
          filePath,
          contentType,
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
