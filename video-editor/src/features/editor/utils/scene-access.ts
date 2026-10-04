// features/editor/utils/scene-access.ts
//
// Viewer's role for a scene block — pulled fresh from the server on each
// resolve since block_members / general access / project role can change
// between clicks. The server does the resolving (see
// resolveEffectiveBlockRole in lib/db/block-members.ts) so the UI and the
// write checks always agree: a specific membership row decides the role
// (capped by the project role); without one, general access sets the
// ceiling for the viewer's project role. The block's Owner is always Owner.

import { type BlockAccess } from "@/features/editor/types/block-members";
import { type EditorRole } from "@/features/editor/types/editor-role";

// _viewerUserId is unused now (the server takes the user from the session).
// Kept so existing callers don't change.
// undefined = couldn't tell (network/5xx/expired session), null = definitely no access
export async function getSceneRoleStrict(
  blockId: string,
  _viewerUserId: string,
): Promise<EditorRole | null | undefined> {
  try {
    const res = await fetch(`/api/blocks/${blockId}/members`, { cache: "no-store" });
    if (res.status === 403 || res.status === 404) return null;
    if (!res.ok) return undefined;
    const access: BlockAccess = await res.json();
    return access.viewerRole ?? null;
  } catch {
    return undefined;
  }
}

export async function getSceneRole(blockId: string, viewerUserId: string) {
  return (await getSceneRoleStrict(blockId, viewerUserId)) ?? null;
}

// Any resolved role, even "Viewer", means the scene can be opened.
export async function canOpenScene(
  blockId: string,
  viewerUserId: string,
): Promise<boolean> {
  return (await getSceneRole(blockId, viewerUserId)) !== null;
}