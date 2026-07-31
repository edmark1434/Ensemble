import { useEffect, useRef } from "react";
import socket from "@/lib/socket";

export type ForumRealtimeEvent = {
  type: string;
  groupId?: string;
  discussionId?: string;
  commentId?: string;
  discussion?: ForumRealtimeDiscussion;
  comment?: { comment_id: string; [key: string]: unknown };
  emittedAt: string;
};

type ForumRealtimeDiscussion = {
  _id: string;
  comments?: { comment_id: string; [key: string]: unknown }[];
  [key: string]: unknown;
};

export function reconcileForumDiscussions<T extends ForumRealtimeDiscussion>(
  current: T[],
  event: ForumRealtimeEvent
): T[] {
  const id = String(event.discussionId || event.discussion?._id || "");
  if (!id) return current;
  if (event.type === "discussion.deleted") return current.filter((item) => String(item._id) !== id);
  if (event.type === "discussion.created" && event.discussion) {
    return current.some((item) => String(item._id) === id)
      ? current.map((item) => String(item._id) === id ? event.discussion as T : item)
      : [event.discussion as T, ...current];
  }
  if (event.discussion) {
    return current.map((item) => String(item._id) === id ? event.discussion as T : item);
  }
  if ((event.type === "comment.created" || event.type === "reply.created") && event.comment) {
    return current.map((item) => {
      if (String(item._id) !== id) return item;
      const comments = item.comments || [];
      return comments.some((comment) => comment.comment_id === event.comment!.comment_id)
        ? item
        : { ...item, comments: [...comments, event.comment] } as T;
    });
  }
  return current;
}

type ForumRoomScope = {
  groupId?: string | null;
  discussionId?: string | null;
};

export function useForumRealtime(
  onEvent: (event: ForumRealtimeEvent) => void,
  scope: ForumRoomScope = {}
) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const groupId = scope.groupId ? String(scope.groupId) : undefined;
  const discussionId = scope.discussionId ? String(scope.discussionId) : undefined;

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const roomScope = { groupId, discussionId };
    const handleEvent = (event: ForumRealtimeEvent) => handlerRef.current(event);
    const joinRooms = () => socket.emit("joinForumRooms", roomScope);

    socket.on("connect", joinRooms);
    socket.on("forum:event", handleEvent);
    if (socket.connected) joinRooms();

    return () => {
      socket.emit("leaveForumRooms", roomScope);
      socket.off("connect", joinRooms);
      socket.off("forum:event", handleEvent);
    };
  }, [groupId, discussionId]);
}
