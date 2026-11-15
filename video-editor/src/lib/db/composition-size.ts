import { db } from "@/lib/db";
import type { CollabTarget } from "@/features/editor/collab/collab-target";

export async function readCompositionSize(target: CollabTarget) {
  if (target.kind === "project") {
    return db.selectFrom("projects").where("project_id", "=", target.id)
      .select(["width", "height"]).executeTakeFirstOrThrow();
  }
  return db.selectFrom("blocks").where("block_id", "=", target.id)
    .select(["resolution_width as width", "resolution_height as height"])
    .executeTakeFirstOrThrow();
}
