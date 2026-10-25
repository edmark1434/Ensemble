import { db } from "@/lib/db";

export async function createMediaUpload(input: {
  userId: string; projectId: string; fileName: string; filePath: string;
  contentType: string; fileSize: number;
  width?: number | null; height?: number | null; durationSeconds?: number | null;
}) {
  return db.transaction().execute(async (transaction) => {
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
