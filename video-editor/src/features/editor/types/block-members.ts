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