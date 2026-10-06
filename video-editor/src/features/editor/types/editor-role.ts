import type { BlockRole } from "@/features/editor/types/block-members";

export type EditorRole = BlockRole; // "Owner" | "Manager" | "Editor" | "Commenter" | "Viewer"

// Alias so existing imports keep working. Safe to delete later.
export type StoredProjectRole = EditorRole;

export function canEditWithRole(role: EditorRole | null | undefined): boolean {
  return role === "Owner" || role === "Manager" || role === "Editor";
}

export function canManageSharing(role: EditorRole | null | undefined): boolean {
  return role === "Owner" || role === "Manager";
}