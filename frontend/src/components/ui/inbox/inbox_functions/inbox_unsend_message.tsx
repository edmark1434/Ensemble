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

export const InboxUnsentMessage: React.FC<InboxUnsentMessageProps> = ({ isSender }) => {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs italic text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 shadow-sm ${
        isSender ? "rounded-br-none" : "rounded-bl-none"
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <Undo2 className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-500 flex-shrink-0" />
      <span>{isSender ? "You unsent a message" : "This message was unsent"}</span>
    </div>
  );
};