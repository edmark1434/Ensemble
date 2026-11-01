import { db } from "@/lib/db";

export function uploadTrashCutoff() {
  return db.selectNoFrom(eb => eb(
    eb.fn("now", []),
    "-",
    eb.fn("make_interval", [eb.val(0), eb.val(0), eb.val(0), eb.val(30)]),
  ).$castTo<Date>().as("cutoff"));
}

export async function deleteUpload(userId: string, id: string, permanent: boolean) {
  const result = permanent
    ? await db.updateTable("media_assets")
      .set(eb => ({ deleted_at: eb.fn<Date>("now", []) }))
      .where("media_asset_id", "=", id).where("owner_user_id", "=", userId)
      .where("trashed_at", "is not", null).where("deleted_at", "is", null).executeTakeFirst()
    : await db.updateTable("media_assets")
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
