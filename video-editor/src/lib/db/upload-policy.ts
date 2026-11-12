import { sql } from "kysely";
import { db } from "@/lib/db";
import { parseStorageLimitBytes, PlanConfigurationError } from "@/lib/plan-feature-values";

// Match the main site's active-subscription selection. No client plan input.
async function readEffectivePlan(userId: string, executor = db) {
  const result = await sql<{ plan_id: string; name: string }>`
    SELECT p.plan_id, p.name FROM plans p
    WHERE p.plan_id = COALESCE(
      (SELECT s.plan_id FROM subscriptions s
       WHERE s.user_id = ${userId} AND UPPER(s.status) IN ('ACTIVE', 'TRIALING')
         AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
       ORDER BY s.updated_at DESC, s.created_at DESC, s.subscription_id DESC LIMIT 1),
      (SELECT free.plan_id FROM plans free WHERE LOWER(free.name) = 'free' ORDER BY free.plan_id LIMIT 1)
    )
  `.execute(executor);
  if (!result.rows[0]) throw new PlanConfigurationError();
  return result.rows[0];
}

export async function readUploadPlan(userId: string, executor = db) {
  return (await readEffectivePlan(userId, executor)).name;
}

export async function readPlanFeatures(userId: string, keys: string[], executor = db) {
  const plan = await readEffectivePlan(userId, executor);
  const result = await sql<{ feature_key: string; value: string }>`
    SELECT f.feature_key, pf.value FROM plan_features pf
    JOIN features f ON f.feature_id = pf.feature_id
    WHERE pf.plan_id = ${plan.plan_id} AND f.feature_key = ANY(${keys}::text[])
  `.execute(executor);
  const features = new Map<string, string>();
  for (const row of result.rows) {
    if (features.has(row.feature_key)) throw new PlanConfigurationError();
    features.set(row.feature_key, row.value);
  }
  return { plan, features };
}

export async function readExportPlanFeatures() {
  return (await sql<{ plan_id: string; name: string; feature_key: string; value: string }>`
    SELECT p.plan_id, p.name, f.feature_key, pf.value FROM plans p
    JOIN plan_features pf ON pf.plan_id = p.plan_id
    JOIN features f ON f.feature_id = pf.feature_id
    WHERE LOWER(p.name) IN ('free', 'premium', 'business')
      AND f.feature_key IN ('export_resolution', 'export_frame_rate')
    ORDER BY CASE LOWER(p.name) WHEN 'free' THEN 0 WHEN 'premium' THEN 1 ELSE 2 END, p.plan_id
  `.execute(db)).rows;
}

export async function readMediaStorageUsage(userId: string, executor = db) {
  const { plan, features } = await readPlanFeatures(userId, ['personal_upload_storage'], executor);
  const limitBytes = parseStorageLimitBytes(features.get('personal_upload_storage'));
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
    plan: plan.name,
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
    .where("project.trashed_at", "is", null)
    .where("member.role", "in", ["Owner", "Manager", "Editor"])
    .select("member.user_id").executeTakeFirst();
}
