// app/api/uploads/presign/route.ts

import {connection, NextRequest, NextResponse} from "next/server";
import { nanoid } from "nanoid";
import {
  buildPublicUrl,
  buildS3Key,
  createPresignedPutUrl,
  getContentType
} from "@/lib/s3";
import { resolveUniqueFileName } from "@/utils/resolve-unique-filename";

interface PresignRequest {
  userId: string;
  fileNames: string[];
}

export async function POST(request: NextRequest) {
  await connection();

  try {
    const body: PresignRequest = await request.json();
    const { userId, fileNames } = body;

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
      const filePath = buildS3Key(userId, fileId, uniqueFileName); // just the S3 folder prefix, unrelated to the db file_id
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