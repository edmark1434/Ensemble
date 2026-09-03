// lib/db/projects.ts
import { db } from "@/lib/db";

const CURSOR_COLORS = ["#F97316", "#3B82F6", "#22C55E", "#EAB308", "#EC4899", "#8B5CF6"];

export async function createProject({
  userId,
  width,
  height,
  name = "My Project",
}: {
  userId: string;
  width: number;
  height: number;
  name?: string;
}): Promise<string> {
  return db.transaction().execute(async (trx) => {
    const project = await trx
      .insertInto("projects")
      .values({
        name,
        status: "active",
        width,
        height,
      })
      .returning(["project_id"])
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("project_members")
      .values({
        project_id: project.project_id,
        user_id: userId,
        role: "Owner",
        cursor_color: CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)],
      })
      .execute();

    return project.project_id;
  });
}