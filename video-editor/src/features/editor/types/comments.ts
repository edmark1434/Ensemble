export type CommentStatus = "open" | "resolved";

export type CommentAttachment = {
  id: string; // files.file_id
  url: string;
  name: string;
  mimeType: string;
};

// someone who can be @mentioned (a member of the project)
export type CommentPerson = {
  userId: string;
  name: string;
  avatarUrl: string | null;
};

export type CommentReply = {
  id: string;
  authorName: string;
  avatarUrl: string | null;
  body: string; // may contain mention tokens: @[Name](userId)
  createdAt: string;
  canDelete: boolean;
  attachments: CommentAttachment[];
};

export type CommentThread = CommentReply & {
  timeMs: number | null;
  status: CommentStatus;
  replies: CommentReply[];
};

export type CommentsPayload = {
  canComment: boolean;
  people: CommentPerson[];
  threads: CommentThread[];
};