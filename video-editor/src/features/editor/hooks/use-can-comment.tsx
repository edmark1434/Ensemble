// features/editor/hooks/use-can-comment.tsx
// Whether this user can see and use comments right now: Commenter or above in the CURRENT room
// (project role at project level, effective scene role inside a scene). It's derived from the same
// live `resolvedRole` the editor already tracks, so it flips with role changes just like canEdit.

import { createContext, useContext } from "react";
import type { EditorRole } from "@/features/editor/types/editor-role";

const COMMENT_ROLES: readonly string[] = ["Owner", "Manager", "Editor", "Commenter"];

export const canCommentWithRole = (role: EditorRole | null | undefined) =>
  !!role && COMMENT_ROLES.includes(role);

const CanCommentContext = createContext(false);

export const CanCommentProvider = CanCommentContext.Provider;
export const useCanComment = () => useContext(CanCommentContext);