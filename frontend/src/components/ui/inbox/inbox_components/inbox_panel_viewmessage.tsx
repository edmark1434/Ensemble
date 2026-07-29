// src/components/ui/inbox/inbox_components/inbox_panel_viewmessage.tsx
import React from "react";
import type { ExtendedMessage } from "../inbox_functions/inbox_unsend_message";

interface InboxPanelViewMessageProps {
  messages: ExtendedMessage[];
  messageLoading: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  endRef: React.RefObject<HTMLDivElement>;
  handleScroll: () => void;
  renderMessage: (message: ExtendedMessage, index: number) => React.ReactNode;
}

export const InboxPanelViewMessage: React.FC<InboxPanelViewMessageProps> = ({
  messages,
  messageLoading,
  containerRef,
  endRef,
  handleScroll,
  renderMessage,
}) => {
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 inbox-scroll-thin flex flex-col"
    >
      {messageLoading ? (
        <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
          Loading messages...
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
          No messages yet. Say hello!
        </div>
      ) : (
        <div className="flex flex-col mt-auto w-full">
          {messages.map((message, index) => renderMessage(message, index))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
};