// features/editor/types/editor-role.ts
//
// Unified role for whatever's currently open — a project or a scene block.

import type { BlockRole } from "@/features/editor/types/block-members";

export type EditorRole = BlockRole; // "Owner" | "Editor" | "Commenter" | "Viewer"

export function canEditWithRole(role: EditorRole | null | undefined): boolean {
  return role === "Owner" || role === "Editor";
}