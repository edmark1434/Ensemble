import { sql } from "kysely";
import { db } from "@/lib/db";

// Match the main site's active-subscription selection. No client plan input.
export async function readUploadPlan(userId: string, executor = db) {
  const result = await sql<{ name: string }>`
    SELECT p.name FROM subscriptions s JOIN plans p ON p.plan_id = s.plan_id
    WHERE s.user_id = ${userId} AND UPPER(s.status) = 'ACTIVE'
      AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
    ORDER BY s.updated_at DESC, s.created_at DESC, s.subscription_id DESC LIMIT 1
  `.execute(executor);
  return result.rows[0]?.name || "Free";
}

export async function readMediaStorageUsage(userId: string, executor = db) {
  const planName = (await readUploadPlan(userId, executor)).trim().toLowerCase();
  const plan = planName === "business" ? "Business" : planName === "premium" ? "Premium" : "Free";
  const limitBytes = plan === "Business" ? 1024 ** 4 : plan === "Premium" ? 100 * 1024 ** 3 : 5 * 1024 ** 3;
  const result = await sql<{ used_bytes: string | number }>`
    SELECT COALESCE(SUM(files.size_bytes), 0)::bigint AS used_bytes
    FROM (
      SELECT DISTINCT media.original_file_id
      FROM media_assets AS media
      WHERE media.owner_user_id = ${userId}
        AND media.deleted_at IS NULL
    ) AS originals
    JOIN files ON files.file_id = originals.original_file_id
    WHERE files.deleted_at IS NULL
  `.execute(executor);
  return {
    plan,
    usedBytes: Number(result.rows[0]?.used_bytes ?? 0),
    limitBytes,
    upgradeUrl: `${(process.env.MAIN_APP_URL || "http://localhost:5173").replace(/\/$/, "")}/credits-subscriptions`,
  };
}

export class StorageLimitError extends Error {
  constructor() { super("Your storage is full or this upload exceeds your available storage. Get more storage or remove uploads to continue."); }
}

export async function assertMediaStorageCapacity(userId: string, bytes: number, executor = db) {
  const storage = await readMediaStorageUsage(userId, executor);
  if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error("Invalid upload size");
  if (storage.usedBytes >= storage.limitBytes || storage.usedBytes + bytes > storage.limitBytes) throw new StorageLimitError();
}

export async function canUploadToProject(userId: string, projectId: string) {
  return !!await db.selectFrom("project_members as member")
    .innerJoin("projects as project", "project.project_id", "member.project_id")
    .where("member.user_id", "=", userId).where("member.project_id", "=", projectId)
    .where("member.deleted_at", "is", null).where("project.deleted_at", "is", null)
    .where("member.role", "in", ["Owner", "Manager", "Editor"])
    .select("member.user_id").executeTakeFirst();
}
