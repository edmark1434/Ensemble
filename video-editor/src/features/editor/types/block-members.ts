// features/editor/types/block-members.ts
//
// Shared by the members API route and the editor UI. No server-only imports
// here — this file is imported from both sides.

// "Owner" is set once when the block is created and can't be assigned or
// changed from the picker, so it's kept out of the assignable set.
export type AssignableBlockRole = "Editor" | "Commenter" | "Viewer";
export type BlockRole = "Owner" | AssignableBlockRole;

export const ASSIGNABLE_BLOCK_ROLES: AssignableBlockRole[] = [
  "Editor",
  "Commenter",
  "Viewer",
];

export interface BlockPerson {
  userId: string;
  name: string;
  email: string;
  // Resolved from accounts.avatar_file_id -> files.path; null = show initials.
  avatarUrl: string | null;
}

export interface BlockMember extends BlockPerson {
  role: AssignableBlockRole;
}

export interface BlockAccess {
  owner: BlockPerson | null;
  // Everyone in block_members except the owner.
  members: BlockMember[];
  // project_members who aren't in block_members yet — the "add" suggestions.
  candidates: BlockPerson[];
  // True when the requesting user is this block's Owner.
  canManage: boolean;
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
  generalAccess: GeneralAccessLevel;
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