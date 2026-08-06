// src/components/ui/inbox/inbox_functions/inbox_pin_message.tsx
import React, { useState, useCallback } from "react";
import { Pin, X } from "lucide-react";
import type { Inbox, Message, PinnedMessage } from "../inbox_dataset";

export const useInboxPinMessage = () => {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);

  const isPinned = useCallback(
    (messageId: string) => pinnedMessages.some((p) => p.message_id === messageId),
    [pinnedMessages]
  );

  const togglePin = useCallback((messageId: string, pinnedBy: string) => {
    setPinnedMessages((prev) => {
      const exists = prev.some((p) => p.message_id === messageId);
      if (exists) {
        return prev.filter((p) => p.message_id !== messageId);
      }
      return [...prev, { message_id: messageId, pinned_by: pinnedBy, pinned_at: new Date() }];
    });
  }, []);

  const unpin = useCallback((messageId: string) => {
    setPinnedMessages((prev) => prev.filter((p) => p.message_id !== messageId));
  }, []);

  return { pinnedMessages, isPinned, togglePin, unpin };
};

interface InboxPinnedBannerProps {
  selectedConversation: Inbox;
  pinnedMessages: PinnedMessage[];
  messages: Message[];
  onUnpin: (messageId: string) => void;
  onJumpTo?: (messageId: string) => void;
}

export const InboxPinnedBanner: React.FC<InboxPinnedBannerProps> = ({
  selectedConversation,
  pinnedMessages,
  messages,
  onUnpin,
  onJumpTo,
}) => {
  const isTicket = selectedConversation.conversation_type === "ticket";
  const ticketDetails = selectedConversation.ticket_details;
  const ticketNumber =
    ticketDetails?.ticket_number ||
    selectedConversation.support_ticket_id ||
    selectedConversation.ticket_id;
  const description =
    ticketDetails?.description ||
    messages.find(
      (message) =>
        message.message_type !== "system" &&
        String(message.author_type || "user").toLowerCase() !== "staff"
    )?.message_content;

  if (!isTicket && pinnedMessages.length === 0) return null;

  return (
    <div className="inbox-scroll-thin border-b border-white/10 bg-[#0d0f1a] px-4 py-2 flex-shrink-0 max-h-28 overflow-y-auto">
      {isTicket && (
        <div className="mb-1 rounded-lg border border-violet-400/20 bg-violet-500/5 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-bold text-violet-300">
              {ticketNumber || "Ticket"}
            </span>
            {ticketDetails?.type && (
              <span className="text-[11px] text-zinc-400">
                Type: <span className="text-zinc-200">{ticketDetails.type}</span>
              </span>
            )}
            {ticketDetails?.status && (
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                {ticketDetails.status}
              </span>
            )}
            {ticketDetails?.priority && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                {ticketDetails.priority} priority
              </span>
            )}
          </div>
          {ticketDetails?.subject && (
            <p className="mt-1 text-xs font-medium text-white">
              {ticketDetails.subject}
            </p>
          )}
          {description && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-400">
              {description}
            </p>
          )}
        </div>
      )}
      {pinnedMessages.map((pin) => {
        const msg = messages.find((m) => m._id === pin.message_id);
        if (!msg) return null;

        return (
          <div
            key={pin.message_id}
            className="flex items-center justify-between gap-2 py-1 text-xs text-zinc-300"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <button
              type="button"
              onClick={() => onJumpTo?.(pin.message_id)}
              className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-white transition"
            >
              <Pin className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
              <span className="truncate">{msg.message_content || "Photo"}</span>
            </button>
            <button
              type="button"
              onClick={() => onUnpin(pin.message_id)}
              className="rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-white transition flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
