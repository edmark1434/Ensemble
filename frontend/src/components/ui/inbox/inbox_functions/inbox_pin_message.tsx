// src/components/ui/inbox/inbox_functions/inbox_pin_message.tsx
import React, { useState, useCallback } from "react";
import { Pin, X } from "lucide-react";
import type { Inbox, Message, PinnedMessage } from "../inbox_dataset";
import useChatState from "../../chat_bubble/chat_state";
import LiveGoogleMeetingBanner from "../../chat_bubble/chat_bubble_components/LiveGoogleMeetingBanner";

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
  onViewAllPins?: () => void;
}

export const InboxPinnedBanner: React.FC<InboxPinnedBannerProps> = ({
  selectedConversation,
  pinnedMessages,
  messages,
  onUnpin,
  onJumpTo,
  onViewAllPins,
}) => {
  const liveGoogleMeeting = useChatState(
    (state) => state.googleMeetingsByConversation[String(selectedConversation._id)]
  );
  const conversationType = String(
    selectedConversation.conversation_type || ""
  ).toLowerCase();
  const isTicket = conversationType === "ticket";
  const hasRestrictedMessageTools = ["ticket", "dispute"].includes(
    conversationType
  );
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

  if (!liveGoogleMeeting && !isTicket && (hasRestrictedMessageTools || pinnedMessages.length === 0)) {
    return null;
  }

  return (
    <div className="inbox-scroll-thin flex-shrink-0 max-h-36 overflow-y-auto bg-white dark:bg-dark-surface">
      {liveGoogleMeeting && <LiveGoogleMeetingBanner call={liveGoogleMeeting} />}
      <div className="px-4 py-2">
      {isTicket && (
        <div className="mb-1 rounded-lg border border-violet-400/20 bg-violet-500/5 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-bold text-violet-300">
              {ticketNumber || "Ticket"}
            </span>
            {ticketDetails?.type && (
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                Type: <span className="text-gray-900 dark:text-zinc-200">{ticketDetails.type}</span>
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
            <p className="mt-1 text-xs font-medium text-gray-900 dark:text-white">
              {ticketDetails.subject}
            </p>
          )}
          {description && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
      )}
      {!hasRestrictedMessageTools && pinnedMessages.length > 0 && (
        <button
          type="button"
          onClick={onViewAllPins}
          className="flex w-full items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-3 py-2 text-xs font-semibold text-yellow-800 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 transition"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <Pin className="h-4 w-4" />
          <span>View All Pins ({pinnedMessages.length})</span>
        </button>
      )}
      </div>
    </div>
  );
};
