import * as Y from "yjs";
import { getProjectRole } from "@/lib/db/block-members";
import { readUploadPlan } from "@/lib/db/upload-policy";
import { isProjectFrozen } from "@/lib/db/projects";
import { readSceneAtSnapshot } from "@/lib/db/snapshot-preview";
import {
  insertProjectSave, insertRestoredScenes, listActiveProjectBlockIds, listProjectSaves as readProjectSaves,
  readProjectSave, readProjectSaveScenes,
} from "@/lib/db/project-saves";
import { liveRooms } from "@/lib/collab/live-rooms";
import { compactProject } from "@/lib/collab/persistence-store";
import { withProjectSnapshotLock } from "@/lib/collab/snapshot-lock";
import { compactBlockFromStorage, withBlockSnapshotLock } from "@/lib/collab/block-persistence-store";
import { copyTemplate, decodeTemplate } from "@/lib/collab/template-copy";
import { loadProjectSavePreview } from "@/lib/collab/snapshot-preview";
import { resolveFileUrl } from "@/lib/file-url";
import { canEditWithRole } from "@/features/editor/types/editor-role";
import type { ProjectSaveSummary } from "@/features/editor/types/project-saves";

export const SAVE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

async function liveRoomState(key: string): Promise<Uint8Array | undefined> {
  const room = await liveRooms.get(key)?.catch(() => null);
  return room ? Y.encodeStateAsUpdate(room.doc) : undefined;
}

// A save compacts the project document and every scene document, including
// what's only in a live room so far, and records them together as one version.
export async function createProjectSave(projectId: string, userId: string) {
  await requireEditor(projectId, userId);
  const blockIds = await listActiveProjectBlockIds(projectId);
  const scenes = await Promise.all(blockIds.map(blockId => withBlockSnapshotLock(blockId, async () => {
    const snapshotId = await compactBlockFromStorage(blockId, await liveRoomState(`block:${blockId}`));
    return snapshotId ? { blockId, snapshotId } : null;
  })));
  const snapshotId = await withProjectSnapshotLock(projectId, async () =>
    compactProject(projectId, await liveRoomState(`project:${projectId}`)));
  if (!snapshotId) throw new ProjectSaveError("There's nothing to save in this project yet.", 409);
  const save = await insertProjectSave({
    projectId, userId, snapshotId,
    scenes: scenes.filter((scene): scene is NonNullable<typeof scene> => scene !== null),
  });
  return { id: save.id, createdAt: save.createdAt.toISOString(), created: save.created };
}

export async function listProjectSaves(projectId: string, userId: string, before: string | null) {
  await requireEditor(projectId, userId);
  await requireSavesPlan(userId);
  const { rows, hasMore } = await readProjectSaves(projectId, before, SAVES_PAGE_SIZE);
  const saves: ProjectSaveSummary[] = rows.map(row => ({
    id: row.project_save_id,
    createdAt: row.created_at.toISOString(),
    createdBy: row.user_id ? {
      name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "Unknown member",
      avatarUrl: resolveFileUrl(row.avatar_path),
    } : null,
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

async function readSceneDocuments(saveId: string) {
  return new Map((await readProjectSaveScenes(saveId)).map(row => [row.block_id, row.document as Uint8Array]));
}

export async function getProjectSavePreview(saveId: string, userId: string) {
  const save = await readAccessibleSave(saveId, userId);
  if (!save) return null;
  return loadProjectSavePreview(save, await readSceneDocuments(saveId), userId);
}

// Works like applying a template in replace mode: the server prepares the
// saved project with fresh scene blocks, and the client swaps it into the live
// project document so the change syncs to everyone and stays undoable.
export async function prepareProjectSaveApply(projectId: string, saveId: string, userId: string) {
  const save = await readAccessibleSave(saveId, userId);
  if (!save || save.project_id !== projectId) throw new ProjectSaveError("This save is no longer available.", 404);
  if (await isProjectFrozen(projectId)) throw new ProjectSaveError("This project is frozen and can't be changed.", 403);
  const sceneDocuments = await readSceneDocuments(saveId);
  let prepared: Awaited<ReturnType<typeof copyTemplate>>;
  try {
    prepared = await copyTemplate(decodeTemplate(save.document), save.name, async blockId => {
      if (!SAVE_UUID.test(blockId)) return null;
      const document = sceneDocuments.get(blockId)
        ?? (await readSceneAtSnapshot(blockId, projectId, save.created_at))?.document;
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
