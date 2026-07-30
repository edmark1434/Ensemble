import api from "@/lib/axios";

export type ForumComment = {
  user_id: string | number;
  comment: string;
  comment_id: string;
  comment_reference_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  attachments: { file_path: string }[];
  likes: { user_id: string | number }[];
  is_edited?: boolean;
  depth?: number;
  children?: ForumComment[];
};

export const buildForumCommentTree = <T extends ForumComment>(comments: T[]): T[] => {
  const commentMap = new Map<string, T>();
  const roots: T[] = [];

  comments.forEach((comment) => {
    commentMap.set(comment.comment_id, { ...comment, children: [] });
  });

  comments.forEach((comment) => {
    const node = commentMap.get(comment.comment_id)!;
    const parent = comment.comment_reference_id
      ? commentMap.get(comment.comment_reference_id)
      : undefined;

    if (parent) {
      parent.children = [...(parent.children || []), node];
    } else {
      roots.push(node);
    }
  });

  const prepareThread = (items: T[], depth = 0): T[] =>
    items
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((comment) => ({
        ...comment,
        depth,
        children: prepareThread((comment.children || []) as T[], depth + 1),
      }));

  return prepareThread(roots);
};

export const uploadForumCommentImage = async (file: File): Promise<string> => {
  const response = await api.post("/api/files/upload-url", {
    folder: "forum-discussions",
    filename: file.name,
    contentType: file.type,
  });

  const { uploadUrl, key } = response.data;
  if (!uploadUrl || !key) {
    throw new Error("Failed to get upload URL");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Upload failed with status ${uploadResponse.status}`);
  }

  return key;
};

export const forumImageUrl = (filePath: string): string =>
  filePath.startsWith("http")
    ? filePath
    : `${import.meta.env.VITE_CLOUDFRONT_URL}/${filePath}`;
