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

export async function updateProject({
  projectId,
  name,
  width,
  height,
}: {
  projectId: string;
  name?: string;
  width?: number;
  height?: number;
}): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (width !== undefined) updates.width = width;
  if (height !== undefined) updates.height = height;

  if (Object.keys(updates).length === 0) return;
  updates.updated_at = new Date();

  await db
    .updateTable("projects")
    .set(updates)
    .where("project_id", "=", projectId)
    .where("deleted_at", "is", null)
    .execute();
}