import { getProjectRole } from "@/lib/db/block-members";
import { readSavePreviewToken, savePreviewUrl } from "@/lib/auth/snapshot-preview-token";
import { readUploadPlan } from "@/lib/db/upload-policy";
import { isProjectFrozen } from "@/lib/db/projects";
import { readSceneAtSnapshot } from "@/lib/db/snapshot-preview";
import {
  insertRestoredScenes, listProjectSaves as readProjectSaves,
  readProjectSave,
} from "@/lib/db/project-saves";
import { compactProjectAndScenes } from "@/lib/collab/persistence-store";
import { copyTemplate, decodeTemplate } from "@/lib/collab/template-copy";
import { loadProjectSavePreview } from "@/lib/collab/snapshot-preview";
import { canEditWithRole } from "@/features/editor/types/editor-role";
import type { ProjectSaveSummary } from "@/features/editor/types/project-saves";

export const SAVE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isSaveId(id: string) {
  return /^[1-9][0-9]{0,18}$/.test(id) && BigInt(id) <= BigInt("9223372036854775807");
}

const SAVES_PAGE_SIZE = 20;
const SAVES_PLANS = new Set(["premium", "business"]);

export class ProjectSaveError extends Error {
  constructor(message: string, readonly status: number, readonly code?: "PLAN_REQUIRED") {
    super(message);
  }
}

export function savesUpgradeUrl() {
  return `${(process.env.MAIN_APP_URL || "http://localhost:5173").replace(/\/$/, "")}/credits-subscriptions`;
}

async function requireEditor(projectId: string, userId: string) {
  if (!canEditWithRole(await getProjectRole(projectId, userId))) {
    throw new ProjectSaveError("You need edit access to this project to use saves.", 403);
  }
}

async function requireSavesPlan(userId: string) {
  const plan = await readUploadPlan(userId);
  if (!SAVES_PLANS.has(plan.trim().toLowerCase())) {
    throw new ProjectSaveError("Upgrade to Premium or Business to browse, preview, and apply saves.", 403, "PLAN_REQUIRED");
  }
}

export async function createProjectSave(projectId: string, userId: string) {
  await requireEditor(projectId, userId);
  const save = await compactProjectAndScenes(projectId);
  return { id: String(save.snapshotId), createdAt: save.createdAt.toISOString(), created: save.created };
}

export async function listProjectSaves(projectId: string, userId: string, before: string | null) {
  await requireEditor(projectId, userId);
  await requireSavesPlan(userId);
  const { rows, hasMore } = await readProjectSaves(projectId, before, SAVES_PAGE_SIZE);
  const saves: ProjectSaveSummary[] = rows.map(row => ({
    id: row.save_id,
    previewUrl: savePreviewUrl(projectId, row.save_id, userId),
    isInitial: row.is_initial,
    createdAt: row.created_at.toISOString(),
  }));
  return { saves, hasMore };
}

async function readAccessibleSave(saveId: string, userId: string) {
  const save = await readProjectSave(saveId);
  if (!save) return null;
  await requireEditor(save.project_id, userId);
  await requireSavesPlan(userId);
  return save;
}

function savedSceneReader(save: { project_id: string; snapshot_id: string }) {
  return async (blockId: string) => SAVE_UUID.test(blockId)
    ? (await readSceneAtSnapshot(blockId, save.project_id, save.snapshot_id))?.document ?? null
    : null;
}

export async function getProjectSavePreview(projectId: string, userId: string, token: string) {
  const saveId = readSavePreviewToken(token, projectId, userId);
  if (!saveId) throw new ProjectSaveError("This preview link is invalid or expired. Open it again from Saves.", 403);
  const save = await readAccessibleSave(saveId, userId);
  if (!save || projectId !== save.project_id) return null;
  return loadProjectSavePreview(save, savedSceneReader(save), userId);
}

// Works like applying a template in replace mode: the server prepares the
// saved project with fresh scene blocks, and the client swaps it into the live
// project document so the change syncs to everyone and stays undoable.
export async function prepareProjectSaveApply(projectId: string, saveId: string, userId: string) {
  const save = await readAccessibleSave(saveId, userId);
  if (!save || save.project_id !== projectId) throw new ProjectSaveError("This save is no longer available.", 404);
  if (await isProjectFrozen(projectId)) throw new ProjectSaveError("This project is frozen and can't be changed.", 403);
  const readScene = savedSceneReader(save);
  let prepared: Awaited<ReturnType<typeof copyTemplate>>;
  try {
    prepared = await copyTemplate(decodeTemplate(save.document), save.name, async blockId => {
      const document = await readScene(blockId);
      return document ? decodeTemplate(document) : null;
    }, async () => {});
  } catch {
    throw new ProjectSaveError("This save has scenes that can no longer be restored.", 409);
  }
  if (!await insertRestoredScenes(projectId, userId, prepared.scenes)) {
    throw new ProjectSaveError("You no longer have edit access to this project.", 403);
  }
  return decodeTemplate(Buffer.from(prepared.document, "base64"));
}
