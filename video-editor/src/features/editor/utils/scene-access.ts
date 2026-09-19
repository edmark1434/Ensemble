// features/editor/utils/scene-access.ts
//
// Whether the current user can open a given scene by double-click — pulled
// fresh from the server on each click since block_members / general access
// can change between clicks.

import { hasBlockAccess, type BlockAccess } from "@/features/editor/types/block-members";

export async function canOpenScene(
  blockId: string,
  viewerUserId: string,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/blocks/${blockId}/members`);
    if (!res.ok) return false;
    const access: BlockAccess = await res.json();
    return hasBlockAccess(access, viewerUserId);
  } catch {
    return false;
  }
}