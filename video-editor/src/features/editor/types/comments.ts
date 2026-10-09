export type CommentReply = {
  id: string;
  authorName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  canDelete: boolean;
};

export type CommentThread = CommentReply & {
  timeMs: number | null;
  replies: CommentReply[];
};

export type CommentsPayload = {
  canComment: boolean;
  threads: CommentThread[];
};