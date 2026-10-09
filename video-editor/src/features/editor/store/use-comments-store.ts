import { create } from "zustand";
import type { CommentsPayload } from "../types/comments";

type Post = (body: string, parentId?: string, timeMs?: number) => Promise<void>;
type Remove = (p: { commentId: string } | { replyId: string }) => Promise<void>;

interface CommentsState {
  data: CommentsPayload | null;
  error: string | null;
  post: Post;
  remove: Remove;
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  sync: (s: Partial<Pick<CommentsState, "data" | "error" | "post" | "remove">>) => void;
}

const noop = async () => {};

export const useCommentsStore = create<CommentsState>((set) => ({
  data: null,
  error: null,
  post: noop,
  remove: noop,
  focusedId: null,
  setFocusedId: (focusedId) => set({ focusedId }),
  sync: (s) => set(s),
}));