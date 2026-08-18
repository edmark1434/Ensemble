// src/components/ui/inbox/inbox_components/inbox_panel_header.tsx
import React from "react";
import {
  Share2,
  Video,
  MoreVertical,
  ExternalLink,
  Briefcase,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Inbox } from "../inbox_dataset";
import useGlobalState from "@/lib/global_state";
import useChatState from "../../chat_bubble/chat_state";

interface InboxPanelHeaderProps {
  selectedConversation: Inbox;
  getConversationName: (inbox: Inbox) => string;
  getAvatar: (inbox: Inbox) => string;
  onToggleDetails?: () => void;
}

export const InboxPanelHeader: React.FC<InboxPanelHeaderProps> = ({
  selectedConversation,
  getConversationName,
  getAvatar,
  onToggleDetails,
}) => {
  const navigate = useNavigate();
  const name = getConversationName(selectedConversation);
  const avatar = getAvatar(selectedConversation);
  const currentAccountId = useGlobalState((state) => state.user?.account_id);
  const otherMember = selectedConversation.members?.find(
    (member) =>
      String(member.account_id) !== String(currentAccountId) &&
      !["left", "removed"].includes(member.status || "active")
  );
  const isOnline = useChatState((state) =>
    otherMember
      ? Boolean(state.onlineAccounts[String(otherMember.account_id)])
      : false
  );
  const typingCount = useChatState(
    (state) =>
      state.typingByConversation[String(selectedConversation._id)]?.length || 0
  );
  const startCall = useChatState((state) => state.startCall);
  const activeCall = useChatState((state) => state.activeCall);
  const groupCall = useChatState(
    (state) => state.groupCallsByConversation[String(selectedConversation._id)]
  );
  const joinGroupCall = useChatState((state) => state.joinGroupCall);
  const isGroup =
    selectedConversation.conversation_type === "group" ||
    selectedConversation.is_group;
  const activeMemberCount = (selectedConversation.members || []).filter(
    (member) => !["left", "removed"].includes(member.status || "active")
  ).length;
  const isEngagement = selectedConversation.conversation_type === "engagement";
  const isTicket = selectedConversation.conversation_type === "ticket";
  const hasRestrictedMessageTools = ["ticket", "dispute"].includes(
    String(selectedConversation.conversation_type || "").toLowerCase()
  );
  const canCall = Boolean(otherMember);
  const listingType =
    selectedConversation.listing_type ||
    (selectedConversation.gig_id ? "gig" : selectedConversation.job_id ? "job" : "");
  const listingPath =
    selectedConversation.listing_path ||
    (listingType === "gig" && selectedConversation.gig_id
      ? `/gigs/${selectedConversation.gig_id}`
      : listingType === "job" && selectedConversation.job_id
      ? `/jobs/postings/${selectedConversation.job_id}`
      : "");
  const statusLabel = typingCount
    ? typingCount === 1
      ? "Typing..."
      : `${typingCount} people typing...`
    : isTicket
    ? `${activeMemberCount} participants`
    : isGroup
    ? `${activeMemberCount} members`
    : isOnline
    ? "Active now"
    : "Offline";
  const participantLabel = groupCall
    ? groupCall.participant_names.length <= 3
      ? `${groupCall.participant_names.join(", ")} ${
          groupCall.participant_names.length === 1 ? "is" : "are"
        } still in the call.`
      : `${groupCall.participant_names.slice(0, 2).join(", ")}, and ${
          groupCall.participant_names.length - 2
        } others are still in the call.`
    : "";

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-dark-surface/95 backdrop-blur-sm border-b border-gray-200 dark:border-white/10 p-4 flex items-center justify-between flex-shrink-0">
      <div className="flex min-w-0 items-center gap-3">
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
          {!isGroup && !isTicket && (
            <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-dark-surface ${isOnline ? "bg-green-500" : "bg-zinc-600"}`} />
          )}
        </div>
        <div className="min-w-0">
          <h2
            className="font-semibold text-gray-900 dark:text-white text-sm"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {name}
          </h2>
          <p
            className="text-xs text-gray-500 dark:text-zinc-500"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {statusLabel}
          </p>
          {isGroup && groupCall && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1.5">
              <span className="max-w-80 truncate text-[11px] text-green-200">
                {participantLabel}
              </span>
              <button
                type="button"
                disabled={Boolean(activeCall)}
                onClick={() => void joinGroupCall(String(selectedConversation._id))}
                className="rounded-md bg-green-500 px-2 py-1 text-[10px] font-semibold text-gray-900 dark:text-white hover:bg-green-400 disabled:opacity-50"
              >
                {activeCall?.conversationId === String(selectedConversation._id)
                  ? "In Call"
                  : "Join Call"}
              </button>
            </div>
          )}
          {isEngagement && (
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium uppercase text-blue-400">
                <Briefcase className="h-3 w-3" />
                {listingType || "engagement"}
              </span>
              <span className="max-w-56 truncate text-xs text-gray-600 dark:text-zinc-300">
                {selectedConversation.listing_title || name}
              </span>
              {listingPath && (
                <button
                  type="button"
                  onClick={() => navigate(listingPath)}
                  className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
                >
                  View Details <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          {isEngagement && selectedConversation.listing_preview && (
            <p className="mt-1 max-w-xl truncate text-[10px] text-gray-500 dark:text-zinc-500">
              {selectedConversation.listing_preview}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button className="rounded-lg p-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white transition">
          <Share2 className="h-5 w-5" />
        </button>
        {!hasRestrictedMessageTools && (
          <button
            disabled={!canCall || Boolean(activeCall)}
            onClick={() =>
              canCall &&
              otherMember &&
              void startCall(
                String(selectedConversation._id),
                String(otherMember.account_id),
                { name, avatar }
              )
            }
            title={canCall ? "Request a meeting" : "No other member is available to meet"}
            className="rounded-lg p-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white transition disabled:opacity-40"
          >
            <Video className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={onToggleDetails}
          title="Chat Details"
          className="rounded-lg p-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white transition"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
