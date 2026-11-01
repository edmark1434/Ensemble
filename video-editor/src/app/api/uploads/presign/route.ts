// app/api/uploads/presign/route.ts

import { connection, NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  buildPublicUrl,
  buildS3Key,
  createPresignedPutUrl,
  getContentType
} from "@/lib/s3";
import { resolveUniqueFileName } from "@/utils/resolve-unique-filename";
import { authorizeMediaUpload } from "@/lib/auth/upload-session";
import { assertMediaStorageCapacity, StorageLimitError } from "@/lib/db/upload-policy";

interface PresignRequest {
  userId: string;
  fileNames: string[];
  fileSizes?: number[];
}

export async function POST(request: NextRequest) {
  await connection();

  try {
    const body: PresignRequest = await request.json();
    const { userId, fileNames } = body;
    const denied = await authorizeMediaUpload(request, userId);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
      return NextResponse.json(
        { error: "fileNames array is required and must not be empty" },
        { status: 400 }
      );
    }

    // userId is already the user_id UUID — no more public_id -> internal id lookup.
    const ownerUserId = userId;
    if (body.fileSizes && (!Array.isArray(body.fileSizes) || body.fileSizes.length !== fileNames.length || body.fileSizes.some(size => !Number.isSafeInteger(size) || size < 0))) {
      return NextResponse.json({ error: "Invalid file sizes." }, { status: 400 });
    }
    await assertMediaStorageCapacity(ownerUserId, body.fileSizes?.reduce((sum, size) => sum + size, 0) ?? 0);

    const uploads = [];
    const reservedInBatch = new Set<string>();

    for (const fileName of fileNames) {
      const uniqueFileName = await resolveUniqueFileName(
        ownerUserId,
        fileName,
        reservedInBatch
      );
      reservedInBatch.add(uniqueFileName);

      const contentType = getContentType(uniqueFileName);
      const fileId = nanoid();
      const filePath = contentType.startsWith("video/")
        ? `uploads/${userId}/incoming/${fileId}/${uniqueFileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`
        : buildS3Key(userId, fileId, uniqueFileName);
      const presignedUrl = await createPresignedPutUrl(filePath, contentType);

      uploads.push({
        fileName: uniqueFileName,
        filePath,
        contentType,
        presignedUrl,
        folder: "uploads",
        url: buildPublicUrl(filePath)
      });
    }

    return NextResponse.json({
      success: true,
      uploads
    });
  } catch (error) {
    if (error instanceof StorageLimitError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error in presign route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
