import { sql } from "kysely";
import { db } from "@/lib/db";
import { readPlanFeatures } from "./upload-policy";
import { PlanConfigurationError } from "@/lib/plan-feature-values";

export interface CollaborativeProjectAllowance {
  used: number;
  limit: number | null;
  isCollaborative: boolean;
  canShare: boolean;
  upgradeUrl: string;
}

export class CollaborativeProjectLimitError extends Error {
  constructor(public readonly allowance: CollaborativeProjectAllowance) {
    super("The project owner has reached their collaborative project limit. Upgrade their plan to share another project.");
  }
}

async function readProjectOwner(projectId: string, executor = db) {
  const owner = await executor.selectFrom("project_members as pm")
    .innerJoin("projects as p", "p.project_id", "pm.project_id")
    .select("pm.user_id")
    .where("pm.project_id", "=", projectId).where("pm.role", "=", "Owner")
    .where("pm.deleted_at", "is", null).where("p.deleted_at", "is", null)
    .where("p.trashed_at", "is", null)
    .orderBy("pm.joined_at").orderBy("pm.user_id").executeTakeFirst();
  if (!owner) throw new PlanConfigurationError();
  return owner.user_id;
}

export async function readCollaborativeProjectAllowance(projectId: string, executor = db): Promise<CollaborativeProjectAllowance> {
  const ownerId = await readProjectOwner(projectId, executor);
  const { features } = await readPlanFeatures(ownerId, ["projects"], executor);
  const rawLimit = features.get("projects")?.trim();
  let limit: number | null;
  if (rawLimit?.toLowerCase() === "unlimited") {
    limit = null;
  } else {
    if (!rawLimit || !/^\d+$/.test(rawLimit)) throw new PlanConfigurationError();
    limit = Number(rawLimit);
    if (!Number.isSafeInteger(limit)) throw new PlanConfigurationError();
  }
  // One slot per owned project with another active member. Retained shared
  // projects in Trash still count, so restoring one cannot bypass the cap.
  const result = await sql<{ used: string; is_collaborative: boolean }>`
    SELECT COUNT(DISTINCT p.project_id)::text AS used,
           COALESCE(BOOL_OR(p.project_id = ${projectId}), false) AS is_collaborative
    FROM projects p
    JOIN project_members owner ON owner.project_id = p.project_id
    WHERE owner.user_id = ${ownerId} AND owner.role = 'Owner'
      AND owner.deleted_at IS NULL AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM project_members member
        WHERE member.project_id = p.project_id AND member.user_id <> ${ownerId}
          AND member.deleted_at IS NULL
      )
  `.execute(executor);
  const used = Number(result.rows[0].used);
  const isCollaborative = result.rows[0].is_collaborative;
  return {
    used, limit, isCollaborative,
    canShare: isCollaborative || limit === null || used < limit,
    upgradeUrl: `${(process.env.MAIN_APP_URL || "http://localhost:5173").replace(/\/$/, "")}/credits-subscriptions`,
  };
}

// Call inside the same transaction that adds/revives the member. Project locks
// serialize joins to this project; the owner lock serializes new collaborations
// across different projects, including direct additions and link redemptions.
export async function lockCollaborativeProjectOwner(projectId: string, trx: typeof db): Promise<void> {
  const project = await trx.selectFrom("projects").select("project_id")
    .where("project_id", "=", projectId).where("deleted_at", "is", null)
    .where("trashed_at", "is", null).forUpdate().executeTakeFirst();
  if (!project) throw new PlanConfigurationError();
  const ownerId = await readProjectOwner(projectId, trx);
  await sql`SELECT pg_advisory_xact_lock(hashtextextended(${`collaborative-projects:${ownerId}`}, 0))`.execute(trx);
}

export async function assertCollaborativeProjectCapacity(projectId: string, trx: typeof db): Promise<void> {
  await lockCollaborativeProjectOwner(projectId, trx);
  const allowance = await readCollaborativeProjectAllowance(projectId, trx);
  if (!allowance.canShare) throw new CollaborativeProjectLimitError(allowance);
}
