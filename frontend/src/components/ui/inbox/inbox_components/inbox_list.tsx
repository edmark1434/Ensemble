// src/components/ui/inbox/inbox_components/inbox_list.tsx
import React from "react";
import { AlertCircle, Lock, MessageCircle } from "lucide-react";
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
    if (isCollapsed) {
      return (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-base p-3 space-y-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex justify-center">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-base px-2 pt-3 pb-2 space-y-1 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="w-full flex items-center gap-3 p-3 rounded-lg"
          >
            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="h-3.5 w-28 bg-gray-200 dark:bg-zinc-800 rounded" />
                <div className="h-2.5 w-10 bg-gray-200 dark:bg-zinc-800 rounded" />
              </div>
              <div className="h-2.5 w-40 bg-gray-200/70 dark:bg-zinc-800/60 rounded" />
            </div>
          </div>
        ))}
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

  const seenTeamIds = new Set<string>();
  const isMarketplaceTab = conversations.some(c =>
    ["marketplace", "marketplace_job", "marketplace_gig", "revision", "engagement"].includes(c.conversation_type || "")
  );

  const isDimmed = (ib: Inbox) => {
    const status = String(ib.contract_status || ib.marketplace_status || "").toLowerCase();
    return Boolean(ib.is_contract_completed) || (isMarketplaceTab && ["completed", "closed", "cancelled"].includes(status));
  };

  const filteredList = conversations
    .filter((inbox) => {
      if (inbox.team_id) {
        const key = String(inbox.team_id);
        if (seenTeamIds.has(key)) return false;
        seenTeamIds.add(key);
      }
      return true;
    })
    .sort((a, b) => {
      const aDim = isDimmed(a);
      const bDim = isDimmed(b);
      if (aDim !== bDim) {
        return aDim ? 1 : -1; // Move all dim ones below all open ones!
      }
      const aTime = new Date(a.last_message_time || a.updated_at || 0).getTime();
      const bTime = new Date(b.last_message_time || b.updated_at || 0).getTime();
      return bTime - aTime;
    });

  const firstDimmedIndex = filteredList.findIndex(item => isDimmed(item));
  const hasOpenAbove = firstDimmedIndex > 0;
  const dimmedCount = firstDimmedIndex !== -1 ? filteredList.length - firstDimmedIndex : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-dark-base inbox-scroll-thin pt-3">
      {filteredList.map((inbox, index) => {
        const isFirstDimmed = index === firstDimmedIndex && hasOpenAbove;
        const viewerAccountId = String(
          inbox.viewer_account_id || currentAccountId || ""
        );
        const isActive = selectedConversation?._id === inbox._id;
        const name = getConversationName(inbox);
        const avatar = getAvatar(inbox);
        const readableLastMessage = inbox.last_message
          ?.replace(/^(?:\[video-call:(?:missed|ended)\]|\[meeting:(?:requested|ended):[^\]]+\]|\[zoom-call:(?:started|ended):[^\]]+\])\s*/, "")
          ?.replace(/^\[project-invite:[^\]]+\]\s*/, "Project invitation: ")
          ?.replace(/^\[team-invite:[^\]]+\]\s*/, "Team invitation: ");

        const isSystemMessage = readableLastMessage && (
          readableLastMessage.includes("created the group chat.") ||
          readableLastMessage.includes("pinned a ") ||
          readableLastMessage.includes("unpinned a ") ||
          readableLastMessage.includes("renamed the group chat") ||
          readableLastMessage.includes("changed the group photo.") ||
          readableLastMessage.includes("left the group chat.") ||
          readableLastMessage.includes("was removed from the group chat.") ||
          (readableLastMessage.includes("added ") && readableLastMessage.includes(" to the group chat."))
        );

        const lastMessage = readableLastMessage
          ? isSystemMessage
            ? readableLastMessage
            : `${
                String(inbox.last_message_sender_id) ===
                viewerAccountId
                  ? "You"
                  : getAccountName?.(String(inbox.last_message_sender_id)) ||
                    getConversationName(inbox)
              }: ${readableLastMessage}`
          : "No messages yet";
        const time = formatTime(inbox.last_message_time || inbox.updated_at);
        const unreadCount = inbox.unread_count || 0;
        const isMarketplace = [
          "marketplace",
          "marketplace_job",
          "marketplace_gig",
          "revision",
          "engagement",
        ].includes(inbox.conversation_type || "");

        const contractStatus = String(
          inbox.contract_status ||
          inbox.marketplace_status ||
          ""
        ).toLowerCase();

        const isContractCompleted =
          Boolean(inbox.is_contract_completed) ||
          (isMarketplace && ["completed", "closed", "cancelled"].includes(contractStatus));
        const isCancelled = contractStatus === "cancelled";
        const isContractualWorkspace =
          inbox.conversation_type === "engagement" ||
          (Boolean(inbox.team_id) && (Boolean(inbox.gig_id) || Boolean(inbox.job_id) || Boolean(inbox.contract_id)));
        const isRegularTeam = !isContractualWorkspace && (inbox.conversation_type === "group" || Boolean(inbox.team_id));
        const resolvedListingType =
          (inbox.gig_id || inbox.listing_type === "gig")
            ? "gig"
            : (inbox.job_id || inbox.listing_type === "job")
            ? "job"
            : inbox.listing_type || "";

        const otherMember = inbox.members?.find(
          (member) =>
            String(member.account_id) !== viewerAccountId
        );
        const isOnline = otherMember
          ? Boolean(onlineAccounts[String(otherMember.account_id)])
          : false;

        return (
          <React.Fragment key={inbox._id}>
            {isFirstDimmed && !isCollapsed && (
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Closed ({dimmedCount})
                </span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800" />
              </div>
            )}
            <button
              onClick={() => onSelectConversation(inbox)}
              title={isCollapsed ? name : undefined}
              className={`w-full flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all duration-200 ${
                isCollapsed ? "p-3 justify-center" : "p-4"
              } ${
                isActive
                  ? "bg-blue-50/70 dark:bg-blue-500/10 border-l-2 border-blue-500"
                  : ""
              } ${
                isContractCompleted ? "opacity-60 hover:opacity-90" : ""
              }`}
            >
            <div className="relative flex-shrink-0">
              {name.startsWith("User ") && name.length === 13 ? (
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-700 animate-pulse" />
              ) : (
                <img
                  src={avatar}
                  alt={name}
                  className="h-10 w-10 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${name.substring(
                      0,
                      2
                    )}&background=71717a&color=fff&bold=true`;
                  }}
                />
              )}
              {inbox.conversation_type === "direct" && (
                <span
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-dark-base ${
                    isOnline ? "bg-green-500" : "bg-zinc-600"
                  }`}
                />
              )}
              {isCollapsed && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-dark-base" />
              )}
            </div>

            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-baseline mb-0.5">
                    {name.startsWith("User ") && name.length === 13 ? (
                      <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 animate-pulse rounded" />
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0 mr-2">
                        <p
                          className="font-medium text-gray-900 dark:text-white truncate text-sm text-left"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                          {name}
                        </p>
                        {isContractualWorkspace ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                            resolvedListingType === "gig"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}>
                            {resolvedListingType === "gig" ? "Gig Workspace" : "Job Workspace"}
                          </span>
                        ) : isRegularTeam ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            Team
                          </span>
                        ) : inbox.conversation_type === "marketplace_gig" ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            Gig Order
                          </span>
                        ) : inbox.conversation_type === "marketplace_job" ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Job Proposal
                          </span>
                        ) : null}
                      </div>
                    )}
                    <p
                      className="text-[10px] text-gray-500 dark:text-zinc-400 flex-shrink-0"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {time}
                    </p>
                  </div>

                  {inbox.listing_title &&
                    inbox.listing_title.trim().toLowerCase() !== name.trim().toLowerCase() && (
                    <p
                      className="text-[11px] text-gray-500 dark:text-zinc-400 truncate text-left mb-0.5 font-normal"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {inbox.listing_title}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <p
                      className="text-xs text-gray-500 dark:text-zinc-400 truncate mr-2 text-left"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {lastMessage}
                    </p>
                    {isContractCompleted ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0 whitespace-nowrap">
                        <Lock className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500" />
                        {isCancelled ? "Cancelled (View Only)" : "Closed Chat (View Only)"}
                      </span>
                    ) : unreadCount > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-500 text-[10px] font-medium text-white px-1 flex-shrink-0">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : (
                      <div className="min-w-[18px] h-[18px] flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              </>
            )}
          </button>
        </React.Fragment>
        );
      })}
    </div>
  );
};
