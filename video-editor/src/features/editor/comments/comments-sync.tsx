// features/editor/comments/comments-sync.tsx

import { useEffect, useMemo } from "react";
import useStore from "../store/use-store";
import { useCommentsStore } from "../store/use-comments-store";
import { tourThreadId, useTourDemo } from "../store/use-tour-demo";
import { useComments } from "./use-comments";
import { useCanComment } from "../hooks/use-can-comment";
import type { CollabTarget } from "@/features/editor/collab/collab-target";

export function CommentsSync() {
  const projectId = useStore((s) => s.projectId);
  const userId = useStore((s) => s.userId);
  const blockId = useStore((s) => s.activeSceneBlockId);
  const canComment = useCanComment();
  const sync = useCommentsStore((s) => s.sync);

  // Below Commenter there's no comments UI at all, so nothing is loaded (no markers either).
  const target = useMemo<CollabTarget | null>(
    () =>
      !canComment ? null
        : blockId ? { kind: "block", id: blockId }
          : projectId ? { kind: "project", id: projectId }
            : null,
    [canComment, blockId, projectId],
  );

  const { data, error, post, remove, upload, setStatus } = useComments(target, userId);

  const sample = useTourDemo(s => s.commentTarget === target?.id ? s.comment : null);

  useEffect(() => {
    sync({
      data: sample ? { canComment: data?.canComment ?? canComment, people: data?.people ?? [],
        threads: [sample, ...(data?.threads ?? [])] } : data,
      error, upload,
      post: async (body, options) => {
        if (options?.parentId !== tourThreadId) return post(body, options);
        useTourDemo.setState(({ comment, attachments }) => {
          if (!comment) return {};
          const reply = { id: tourThreadId + ":" + crypto.randomUUID(), body, createdAt: new Date().toISOString(),
            authorName: comment.authorName, avatarUrl: comment.avatarUrl, canDelete: true,
            attachments: attachments.filter(file => options.fileIds?.includes(file.id)) };
          return { comment: { ...comment, replies: [...comment.replies, reply] } };
        });
      },
      remove: async (entry) => {
        if ("commentId" in entry && entry.commentId === tourThreadId) {
          useTourDemo.setState({ comment: null });
        } else if ("replyId" in entry && entry.replyId.startsWith(tourThreadId + ":")) {
          useTourDemo.setState(({ comment }) => comment ? { comment: { ...comment,
            replies: comment.replies.filter(reply => reply.id !== entry.replyId) } } : {});
        } else await remove(entry);
      },
      setStatus: async (id, status) => {
        if (id !== tourThreadId) return setStatus(id, status);
        useTourDemo.setState(({ comment }) => comment ? { comment: { ...comment, status } } : {});
      },
    });
  }, [sample, data, canComment, error, post, remove, upload, setStatus, sync]);

  return null;
}
