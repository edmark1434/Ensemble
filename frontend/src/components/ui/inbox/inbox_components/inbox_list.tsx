// src/components/ui/inbox/inbox_components/inbox_list.tsx
import React from "react";
import { AlertCircle, MessageCircle } from "lucide-react";
import type { Inbox } from "../inbox_dataset";
import useGlobalState from "@/lib/global_state";
import useChatState from "../../chat_bubble/chat_state";

interface InboxListProps {
  conversations: Inbox[];
  selectedConversation: Inbox | null;
  onSelectConversation: (inbox: Inbox) => void;
  loading: boolean;
  searchQuery: string;
  getConversationName: (inbox: Inbox) => string;
  getAvatar: (inbox: Inbox) => string;
  getAccountName?: (accountId: string) => string | undefined;
  formatTime: (dateString?: string | Date) => string;
  isCollapsed?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const InboxList: React.FC<InboxListProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  loading,
  searchQuery,
  getConversationName,
  getAvatar,
  getAccountName,
  formatTime,
  isCollapsed = false,
  error,
  onRetry,
}) => {
  const currentAccountId = useGlobalState((state) => state.user?.account_id);
  const onlineAccounts = useChatState((state) => state.onlineAccounts);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
        {!isCollapsed && (
          <>
            <p className="text-xs text-gray-500 dark:text-zinc-400">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg bg-gray-100 dark:bg-white/10 px-3 py-1.5 text-xs text-gray-900 dark:text-white hover:bg-white/15"
            >
              Try again
            </button>
          </>
        )}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <MessageCircle className="h-8 w-8 text-gray-500 dark:text-zinc-400 mb-2" />
        {!isCollapsed && (
          <p className="text-xs text-gray-500 dark:text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {searchQuery ? "No conversations found" : "No messages yet"}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-surface inbox-scroll-thin">
      {conversations.map((inbox) => {
        const isActive = selectedConversation?._id === inbox._id;
        const name = getConversationName(inbox);
        const avatar = getAvatar(inbox);
        const readableLastMessage = inbox.last_message
          ?.replace(/^(?:\[video-call:(?:missed|ended)\]|\[meeting:(?:requested|ended):[^\]]+\]|\[zoom-call:(?:started|ended):[^\]]+\])\s*/, "");
        const lastMessage = readableLastMessage
          ? `${
              String(inbox.last_message_sender_id) ===
              String(currentAccountId)
                ? "You"
                : getAccountName?.(String(inbox.last_message_sender_id)) ||
                  getConversationName(inbox)
            }: ${readableLastMessage}`
          : "No messages yet";
        const time = formatTime(inbox.last_message_time || inbox.updated_at);
        const unreadCount = inbox.unread_count || 0;
        const otherMember = inbox.members?.find(
          (member) =>
            String(member.account_id) !== String(currentAccountId)
        );
        const isOnline = otherMember
          ? Boolean(onlineAccounts[String(otherMember.account_id)])
          : false;

        return (
          <button
            key={inbox._id}
            onClick={() => onSelectConversation(inbox)}
            title={isCollapsed ? name : undefined}
            className={`w-full flex items-center gap-3 hover:bg-gray-50 dark:bg-white/5 transition-all duration-200 ${
              isCollapsed ? "p-3 justify-center" : "p-4"
            } ${
              isActive
                ? "bg-gradient-to-r from-blue-500/20 to-transparent border-l-2 border-blue-500"
                : ""
            }`}
          >
            <div className="relative flex-shrink-0">
              <img
                src={avatar}
                alt={name}
                className="h-10 w-10 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${name.substring(
                    0,
                    2
                  )}&background=6366f1&color=fff&bold=true`;
                }}
              />
              {inbox.conversation_type === "direct" && (
                <span
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-dark-surface ${
                    isOnline ? "bg-green-500" : "bg-zinc-600"
                  }`}
                />
              )}
              {isCollapsed && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-dark-surface" />
              )}
            </div>

            {!isCollapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p
                    className="font-medium text-gray-900 dark:text-white truncate text-sm"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {name}
                  </p>
                  <p
                    className="text-xs text-gray-500 dark:text-zinc-500 truncate"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {lastMessage}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p
                    className="text-[10px] text-gray-500 dark:text-zinc-500"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {time}
                  </p>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-500 text-[10px] font-medium text-gray-900 dark:text-white px-1 mt-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
};
