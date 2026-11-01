import { db } from "@/lib/db";
import { sql } from "kysely";
import { assertMediaStorageCapacity } from "./upload-policy";

export async function createMediaUpload(input: {
  userId: string; projectId: string; fileName: string; filePath: string;
  contentType: string; fileSize: number;
  width?: number | null; height?: number | null; durationSeconds?: number | null;
}) {
  return db.transaction().execute(async (transaction) => {
    // Serialize finalization per account so simultaneous uploads cannot overspend storage.
    await sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.userId}, 0))`.execute(transaction);
    await assertMediaStorageCapacity(input.userId, input.fileSize, transaction);
    const file = await transaction.insertInto("files").values({
      name: input.fileName, path: input.filePath, mime_type: input.contentType, size_bytes: input.fileSize
    }).returning("file_id").executeTakeFirstOrThrow();
    return transaction.insertInto("media_assets").values({
      owner_user_id: input.userId, project_id: input.projectId, name: input.fileName,
      original_file_id: file.file_id, proxy_file_id: file.file_id, thumbnail_file_id: file.file_id,
      type: input.contentType.split("/")[0], width: input.width ?? null, height: input.height ?? null,
      duration_seconds: input.durationSeconds ?? null
    }).returning("media_asset_id").executeTakeFirstOrThrow();
  });
}
