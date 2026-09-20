// features/editor/utils/scene-access.ts
//
// Viewer's role for a scene block — pulled fresh from the server on each
// resolve since block_members / general access can change between clicks.
// Effective role is the higher of general access (mapped from the block's
// GeneralAccessLevel) and the viewer's specific membership row.

import { type BlockAccess, type GeneralAccessLevel } from "@/features/editor/types/block-members";
import { type EditorRole } from "@/features/editor/types/editor-role";

const ROLE_RANK: Record<EditorRole, number> = { Viewer: 0, Commenter: 1, Editor: 2, Owner: 3 };

function roleFromGeneralAccess(level: GeneralAccessLevel): EditorRole | null {
  switch (level) {
    case "Anyone can edit": return "Editor";
    case "Anyone can comment": return "Commenter";
    case "Anyone can view": return "Viewer";
    case "Restricted": return null;
    default: return null;
  }
}

function resolveBlockRole(access: BlockAccess, viewerUserId: string): EditorRole | null {
  if (access.owner?.userId === viewerUserId) return "Owner";

  const specific = access.members.find((m) => m.userId === viewerUserId)?.role ?? null;
  const general = roleFromGeneralAccess(access.generalAccess);

  if (specific && general) return ROLE_RANK[specific] >= ROLE_RANK[general] ? specific : general;
  return specific ?? general;
}

export async function getSceneRole(
  blockId: string,
  viewerUserId: string,
): Promise<EditorRole | null> {
  try {
    const res = await fetch(`/api/blocks/${blockId}/members`);
    if (!res.ok) return null;
    const access: BlockAccess = await res.json();
    return resolveBlockRole(access, viewerUserId);
  } catch {
    return null;
  }
}

// Any resolved role, even "Viewer", means the scene can be opened.
export async function canOpenScene(
  blockId: string,
  viewerUserId: string,
): Promise<boolean> {
  return (await getSceneRole(blockId, viewerUserId)) !== null;
}