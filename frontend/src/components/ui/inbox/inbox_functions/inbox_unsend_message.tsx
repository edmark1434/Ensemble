// src/components/ui/inbox/inbox_functions/inbox_unsend_message.tsx
import React, { useCallback } from "react";
import { Undo2 } from "lucide-react";
import type { Message } from "../inbox_dataset";

export interface ExtendedMessage extends Message {
  is_unsent?: boolean;
}

export const useInboxUnsendMessage = (
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const unsendMessage = useCallback(
    (messageId: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId) {
            return {
              ...msg,
              is_unsent: true,
              message_content: "",
              attachments: [],
              links: [],
              message_react: [],
            } as ExtendedMessage;
          }
          return msg;
        })
      );
    },
    [setMessages]
  );

  return { unsendMessage };
};

interface InboxUnsentMessageProps {
  isSender: boolean;
}

export const InboxUnsentMessage: React.FC<InboxUnsentMessageProps & { body?: string }> = ({
  isSender,
  body,
}) => {
  return (
    <div
      className={`max-w-[75%] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 ${
        isSender ? "rounded-br-none" : "rounded-bl-none"
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
        <Undo2 className="h-3.5 w-3.5 flex-shrink-0" />
        Deleted message
      </p>
      {body?.trim() ? (
        <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-zinc-100">{body}</p>
      ) : (
        <p className="italic text-gray-500 dark:text-zinc-500">No text was saved with this message.</p>
      )}
    </div>
  );
};