import type { BlockRole } from "@/features/editor/types/block-members";

export type EditorRole = BlockRole; // "Owner" | "Editor" | "Commenter" | "Viewer"

// What project_members.role can hold. "Manager" is an Editor who can also
// manage project sharing; it only matters in the share flow.
export type StoredProjectRole = EditorRole | "Manager";

export function toEditorRole(role: StoredProjectRole | null | undefined): EditorRole | null {
  if (!role) return null;
  return role === "Manager" ? "Editor" : role;
}

export function canEditWithRole(role: StoredProjectRole | null | undefined): boolean {
  const r = toEditorRole(role);
  return r === "Owner" || r === "Editor";
}

export function canManageSharing(role: StoredProjectRole | null | undefined): boolean {
  return role === "Owner" || role === "Manager";
}