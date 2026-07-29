// src/components/ui/inbox/inbox_functions/inbox_reply_message.tsx
import React from "react";
import { CornerDownRight } from "lucide-react";
import type { Message } from "../inbox_dataset";

/**
 * Smoothly scrolls to a referenced message inside the scroll container
 * and flashes the message color for 1.5 seconds.
 */
export const scrollToRepliedMessage = (
  containerRef: React.RefObject<HTMLDivElement>,
  replyMessageId: string
) => {
  if (!containerRef.current || !replyMessageId) return;

  const targetWrapper = containerRef.current.querySelector<HTMLElement>(
    `[data-message-id="${replyMessageId}"]`
  );

  if (targetWrapper) {
    // 1. Smooth scroll to the target message
    targetWrapper.scrollIntoView({ behavior: "smooth", block: "center" });

    // 2. Find the actual chat bubble container inside the message row
    const bubbleEl = targetWrapper.querySelector<HTMLElement>(".relative.rounded-2xl");

    if (bubbleEl) {
      // Add color change & thin ring highlight
      bubbleEl.classList.add(
        "transition-all",
        "duration-300",
        "bg-blue-600/40",
        "ring-1",
        "ring-blue-400/80",
        "shadow-md",
        "shadow-blue-500/20"
      );

      // Remove the highlight after 1.5 seconds (1500 ms)
      setTimeout(() => {
        bubbleEl.classList.remove(
          "bg-blue-600/40",
          "ring-1",
          "ring-blue-400/80",
          "shadow-md",
          "shadow-blue-500/20"
        );
      }, 1500);
    }
  }
};

interface InboxReplyQuoteProps {
  replyToMessageId: string;
  messages: Message[];
  currentUserId: string;
  onJumpToReply: (messageId: string) => void;
}

export const InboxReplyQuote: React.FC<InboxReplyQuoteProps> = ({
  replyToMessageId,
  messages,
  currentUserId,
  onJumpToReply,
}) => {
  if (!replyToMessageId) return null;

  const parentMsg = messages.find((m) => m._id === replyToMessageId);

  const previewContent = parentMsg
    ? parentMsg.message_content || (parentMsg.attachments?.length ? "Photo" : "Message")
    : "Original message unavailable";

  const isParentSender = parentMsg?.sender_id === currentUserId;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onJumpToReply(replyToMessageId);
      }}
      className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-black/25 px-2.5 py-1.5 text-left text-xs transition hover:bg-black/40 border-l-2 border-blue-400 w-full group/reply"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <CornerDownRight className="h-3 w-3 text-blue-400 flex-shrink-0 group-hover/reply:translate-x-0.5 transition-transform" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-blue-300">
          {isParentSender ? "You" : "Replied to a message"}
        </p>
        <p className="truncate text-zinc-300 text-[11px]">{previewContent}</p>
      </div>
    </button>
  );
};