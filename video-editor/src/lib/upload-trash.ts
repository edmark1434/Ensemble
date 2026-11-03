import { db } from "@/lib/db";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3";

export function uploadTrashCutoff() {
  return db.selectNoFrom(eb => eb(
    eb.fn("now", []),
    "-",
    eb.fn("make_interval", [eb.val(0), eb.val(0), eb.val(0), eb.val(30)]),
  ).$castTo<Date>().as("cutoff"));
}

export async function deleteUpload(userId: string, id: string, permanent: boolean) {
  if (permanent) {
    return db.transaction().execute(async transaction => {
      const upload = await transaction.selectFrom("media_assets").selectAll()
        .where("media_asset_id", "=", id).where("owner_user_id", "=", userId)
        .where("is_marketed", "=", false)
        .where("trashed_at", "is not", null).where("deleted_at", "is", null)
        .forUpdate().executeTakeFirst();
      if (!upload) return false;
      const files = await transaction.selectFrom("files").select("path")
        .where("file_id", "in", [upload.original_file_id, upload.proxy_file_id, upload.thumbnail_file_id]).execute();
      const keys = [...new Set(files.map(file => file.path))];
      // A legacy object can be referenced by multiple file/media rows.
      const shared = await transaction.selectFrom("media_assets as media")
        .innerJoin("files", join => join.on(eb => eb.or([
          eb("files.file_id", "=", eb.ref("media.original_file_id")),
          eb("files.file_id", "=", eb.ref("media.proxy_file_id")),
          eb("files.file_id", "=", eb.ref("media.thumbnail_file_id")),
        ])))
        .select("files.path").where("media.media_asset_id", "!=", id)
        .where("media.deleted_at", "is", null).where("files.path", "in", keys).execute();
      const retained = new Set(shared.map(file => file.path));
      const objects = keys.filter(key => !retained.has(key)).map(Key => ({ Key }));
      if (objects.some(({ Key }) => !Key.startsWith(`uploads/${userId}/`))) throw new Error("Invalid upload storage path");
      if (objects.length) {
        const result = await s3Client.send(new DeleteObjectsCommand({
          Bucket: S3_BUCKET_NAME, Delete: { Objects: objects, Quiet: true },
        }), { abortSignal: AbortSignal.timeout(15000) });
        if (result.Errors?.length) throw new Error("Unable to remove upload files");
      }
      await transaction.updateTable("media_assets")
        .set(eb => ({ deleted_at: eb.fn<Date>("now", []) }))
        .where("media_asset_id", "=", id).execute();
      return true;
    });
  }
  const result = await db.updateTable("media_assets")
      .set(eb => ({ trashed_at: eb.fn<Date>("now", []) }))
      .where("media_asset_id", "=", id).where("owner_user_id", "=", userId)
      .where("trashed_at", "is", null).where("deleted_at", "is", null).executeTakeFirst();
  return Number(result.numUpdatedRows) > 0;
}

export async function restoreUpload(userId: string, id: string) {
  const result = await db.updateTable("media_assets")
    .set({ trashed_at: null })
    .where("media_asset_id", "=", id)
    .where("owner_user_id", "=", userId)
    .where("deleted_at", "is", null)
    .where("trashed_at", ">", uploadTrashCutoff())
    .executeTakeFirst();
  return Number(result.numUpdatedRows) > 0;
}
