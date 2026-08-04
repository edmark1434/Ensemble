import { db } from "@/lib/db";

export async function resolveProjectId(publicId: string): Promise<number> {
  const project = await db
    .selectFrom("projects")
    .select("project_id")
    .where("public_id", "=", publicId)
    .executeTakeFirst();

  if (!project) {
    throw new Error(`Project not found for public_id: ${publicId}`);
  }

  return project.project_id;
}

export async function resolveUserIdByAccountPublicId(
  accountPublicId: string
): Promise<number> {
  const row = await db
    .selectFrom("users")
    .innerJoin("accounts", "accounts.account_id", "users.account_id")
    .select("users.user_id")
    .where("accounts.public_id", "=", accountPublicId)
    .executeTakeFirst();

  if (!row) {
    throw new Error(`User not found for account public_id: ${accountPublicId}`);
  }

  return row.user_id;
}