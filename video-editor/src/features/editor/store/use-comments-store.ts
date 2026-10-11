// features/editor/store/use-comments-store.ts

import { create } from "zustand";
import type { CommentAttachment, CommentStatus, CommentsPayload } from "../types/comments";

export type CommentFilter = "all" | "open" | "mentions" | "resolved";
export type CommentSort = "timestamp" | "date";

type Post = (
  body: string,
  opts?: { parentId?: string; timeMs?: number; fileIds?: string[] },
) => Promise<void>;
type Remove = (p: { commentId: string } | { replyId: string }) => Promise<void>;
type Upload = (file: File) => Promise<CommentAttachment>;
type SetStatus = (commentId: string, status: CommentStatus) => Promise<void>;

interface CommentsState {
  data: CommentsPayload | null;
  error: string | null;
  post: Post;
  remove: Remove;
  upload: Upload;
  setStatus: SetStatus;
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  // which thread the floating "comment-thread" window is showing
  openThreadId: string | null;
  setOpenThreadId: (id: string | null) => void;
  // panel list controls (kept here so they survive switching to the controls panel and back)
  filter: CommentFilter;
  setFilter: (f: CommentFilter) => void;
  sort: CommentSort;
  setSort: (s: CommentSort) => void;
  sync: (
    s: Partial<Pick<CommentsState, "data" | "error" | "post" | "remove" | "upload" | "setStatus">>,
  ) => void;
}

const noop = async () => {};

export const useCommentsStore = create<CommentsState>((set) => ({
  data: null,
  error: null,
  post: noop,
  remove: noop,
  upload: async () => {
    throw new Error("comments not ready");
  },
  setStatus: noop,
  focusedId: null,
  setFocusedId: (focusedId) => set({ focusedId }),
  openThreadId: null,
  setOpenThreadId: (openThreadId) => set({ openThreadId }),
  filter: "all",
  setFilter: (filter) => set({ filter }),
  sort: "date",
  setSort: (sort) => set({ sort }),
  sync: (s) => set(s),
}));