import { db } from "@/lib/db";

// Keep membership rows intact for restoration, but never grant access to trash.
export function activeProjectIds() {
  return db.selectFrom("projects").select("project_id")
    .where("deleted_at", "is", null).where("trashed_at", "is", null);
}
