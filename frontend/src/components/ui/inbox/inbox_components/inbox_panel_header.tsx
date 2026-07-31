// src/components/ui/inbox/inbox_components/inbox_panel_header.tsx
import React from "react";
import { Share2, Video, MoreVertical } from "lucide-react";
import type { Inbox } from "../inbox_dataset";

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
  const name = getConversationName(selectedConversation);
  const avatar = getAvatar(selectedConversation);

  return (
    <div className="sticky top-0 z-10 bg-[#0d0f1a]/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
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
        <div>
          <h2
            className="font-semibold text-white text-sm"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {name}
          </h2>
          <p
            className="text-xs text-zinc-500"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {selectedConversation.conversation_type === "direct" ||
            !selectedConversation.is_group
              ? "Active now"
              : `${selectedConversation.members?.length || 0} members`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
          <Share2 className="h-5 w-5" />
        </button>
        <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
          <Video className="h-5 w-5" />
        </button>
        <button
          onClick={onToggleDetails}
          title="Chat Details"
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};