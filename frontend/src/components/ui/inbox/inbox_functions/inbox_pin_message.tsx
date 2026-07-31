// src/components/ui/inbox/inbox_functions/inbox_pin_message.tsx
import React, { useState, useCallback } from "react";
import { Pin, X } from "lucide-react";
import type { Message, PinnedMessage } from "../inbox_dataset";

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
  pinnedMessages: PinnedMessage[];
  messages: Message[];
  onUnpin: (messageId: string) => void;
  onJumpTo?: (messageId: string) => void;
}

export const InboxPinnedBanner: React.FC<InboxPinnedBannerProps> = ({
  pinnedMessages,
  messages,
  onUnpin,
  onJumpTo,
}) => {
  if (pinnedMessages.length === 0) return null;

  return (
    <div className="inbox-scroll-thin border-b border-white/10 bg-[#0d0f1a] px-4 py-2 flex-shrink-0 max-h-28 overflow-y-auto">
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