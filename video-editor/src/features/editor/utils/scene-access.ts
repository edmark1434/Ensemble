// features/editor/utils/scene-access.ts
//
// Viewer's role for a scene block — pulled fresh from the server on each
// resolve since block_members / general access / project role can change
// between clicks. The server does the resolving (see
// resolveEffectiveBlockRole in lib/db/block-members.ts) so the UI and the
// write checks always agree: general access is a ceiling on the viewer's
// project role, a specific membership row can raise it, and the block's
// Owner is always Owner.

import { type BlockAccess } from "@/features/editor/types/block-members";
import { type EditorRole } from "@/features/editor/types/editor-role";

// _viewerUserId is unused now (the server takes the user from the session).
// Kept so existing callers don't change.
export async function getSceneRole(
  blockId: string,
  _viewerUserId: string,
): Promise<EditorRole | null> {
  try {
    const res = await fetch(`/api/blocks/${blockId}/members`);
    if (!res.ok) return null;
    const access: BlockAccess = await res.json();
    return access.viewerRole ?? null;
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