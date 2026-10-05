// features/editor/types/block-members.ts
//
// Shared by the members API route and the editor UI. No server-only imports
// here — this file is imported from both sides.

// Stored in block_members.role. "Manager" is an Editor who can also manage scene access.
export type AssignableBlockRole = "Manager" | "Editor" | "Commenter" | "Viewer";
export type StoredBlockRole = "Owner" | AssignableBlockRole;
// What a stored role resolves to for editing and viewing. Manager behaves as Editor.
export type BlockRole = "Owner" | "Editor" | "Commenter" | "Viewer";

export const ASSIGNABLE_BLOCK_ROLES: AssignableBlockRole[] = [
  "Manager",
  "Editor",
  "Commenter",
  "Viewer",
];

export const ROLE_RANK: Record<StoredBlockRole, number> = {
  Viewer: 0,
  Commenter: 1,
  Editor: 2,
  Manager: 2,
  Owner: 3,
};

export const minRole = (a: StoredBlockRole, b: StoredBlockRole): StoredBlockRole =>
  ROLE_RANK[a] <= ROLE_RANK[b] ? a : b;

export const toBlockRole = (r: StoredBlockRole): BlockRole =>
  r === "Manager" ? "Editor" : r;

// Scene Owner, or a Manager who is still at least an Editor in the project.
export function canManageBlockAccess({
  blockRole,
  projectRole,
}: {
  blockRole: StoredBlockRole | null;
  projectRole: BlockRole | null;
}): boolean {
  if (blockRole === "Owner") return true;
  return blockRole === "Manager" && !!projectRole && ROLE_RANK[projectRole] >= ROLE_RANK.Editor;
}

export interface BlockPerson {
  userId: string;
  name: string;
  email: string;
  // Resolved from accounts.avatar_file_id -> files.path; null = show initials.
  avatarUrl: string | null;
  projectRole?: BlockRole | null;
  // Raw project role for display only ("Manager" is not collapsed to "Editor").
  projectRoleLabel?: BlockRole | "Manager" | null;
}

export interface BlockMember extends BlockPerson {
  role: AssignableBlockRole;          // what was granted
  effectiveRole: BlockRole | null;    // what applies now
}

export type GeneralAccessLevel =
  | "Anyone can edit"
  | "Anyone can comment"
  | "Anyone can view"
  | "Restricted";

export const GENERAL_ACCESS_LEVELS: GeneralAccessLevel[] = [
  "Anyone can edit",
  "Anyone can comment",
  "Anyone can view",
  "Restricted",
];

export const DEFAULT_GENERAL_ACCESS: GeneralAccessLevel = "Anyone can edit";

export interface BlockAccess {
  owner: BlockPerson | null;
  members: BlockMember[];
  candidates: BlockPerson[];
  canManage: boolean;
  canGrantManager: boolean;
  generalAccess: GeneralAccessLevel;
  // The requesting user's effective role in this block, resolved server-side
  // (project role capped by general access, raised by a block_members row).
  // null = no access.
  viewerRole: BlockRole | null;
}

/**
 * Whether `viewerUserId` can open/use this block at all — as the scene
 * Owner, an explicit block member (any role), or via general access when
 * it isn't Restricted. Doesn't distinguish role level (Editor vs Viewer) —
 * callers that need the specific role should read `owner`/`members` directly.
 */
export function hasBlockAccess(
  access: Pick<BlockAccess, "owner" | "members" | "generalAccess">,
  viewerUserId: string,
): boolean {
  if (!viewerUserId) return false;
  if (access.owner?.userId === viewerUserId) return true;
  if (access.members.some((m) => m.userId === viewerUserId)) return true;
  return access.generalAccess !== "Restricted";
}