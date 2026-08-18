// src/components/ui/inbox/inbox_components/inbox_panel_viewmessage.tsx
import React from "react";
import { AlertCircle } from "lucide-react";
import type { ExtendedMessage } from "../inbox_functions/inbox_unsend_message";

interface InboxPanelViewMessageProps {
  messages: ExtendedMessage[];
  messageLoading: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  endRef: React.RefObject<HTMLDivElement>;
  handleScroll: () => void;
  renderMessage: (message: ExtendedMessage, index: number) => React.ReactNode;
  error?: string | null;
  onRetry?: () => void;
  hasOlderMessages?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
}

export const InboxPanelViewMessage: React.FC<InboxPanelViewMessageProps> = ({
  messages,
  messageLoading,
  containerRef,
  endRef,
  handleScroll,
  renderMessage,
  error,
  onRetry,
  hasOlderMessages,
  loadingOlder,
  onLoadOlder,
}) => {
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 inbox-scroll-thin flex flex-col"
    >
      {messageLoading ? (
        <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-zinc-500 text-sm">
          Loading messages...
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
          <p className="text-sm text-gray-500 dark:text-zinc-400">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-gray-100 dark:bg-white/10 px-3 py-1.5 text-xs text-gray-900 dark:text-white hover:bg-white/15"
          >
            Try again
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-zinc-500 text-sm">
          No messages yet. Say hello!
        </div>
      ) : (
        <div className="flex flex-col mt-auto w-full">
          {hasOlderMessages && (
            <button
              type="button"
              disabled={loadingOlder}
              onClick={onLoadOlder}
              className="mx-auto mb-3 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-1.5 text-xs text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:bg-white/10 disabled:opacity-50"
            >
              {loadingOlder ? "Loading..." : "Load older messages"}
            </button>
          )}
          {messages.map((message, index) => renderMessage(message, index))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
};
