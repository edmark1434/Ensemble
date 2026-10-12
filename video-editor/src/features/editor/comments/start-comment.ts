// features/editor/comments/start-comment.ts
// Opens the comments panel with the composer ready at the playhead.
// Used by the timeline header's "Add comment" button and the C shortcut.

import useLayoutStore from "../store/use-layout-store";
import { useCommentsStore } from "../store/use-comments-store";

export function startComment() {
  useLayoutStore.getState().setActiveRightItem("comments");
  useCommentsStore.getState().requestCompose();
}

// Opens the comments panel without composing (playhead is already on a comment).
export function openComments() {
  useLayoutStore.getState().setActiveRightItem("comments");
}