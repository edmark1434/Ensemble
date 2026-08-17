// src/components/ui/inbox/inbox_functions/inbox_edit_message.tsx
import React, { useCallback } from "react";
import type { Message } from "../inbox_dataset";

export const useInboxEditMessage = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const updateEditedMessage = useCallback(
    (messageId: string, newContent: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                message_content: newContent,
                is_edited: true,
                updated_at: new Date(),
              }
            : m
        )
      );
    },
    [setMessages]
  );

  return { updateEditedMessage };
};

interface InboxEditedBadgeProps {
  isEdited?: boolean;
}

export const InboxEditedBadge: React.FC<InboxEditedBadgeProps> = ({ isEdited }) => {
  if (!isEdited) return null;

  return (
    <span
      className="text-[10px] text-gray-500 dark:text-zinc-500 italic select-none"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      Edited
    </span>
  );
};