// src/components/ui/inbox/inbox_functions/inbox_side_details.tsx
import React, { useState } from "react";
import {
  X,
  User,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Pencil,
  Check,
  Crown,
  Users,
  Pin,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import type { Inbox, Message } from "../inbox_dataset";

interface InboxSideDetailsProps {
  selectedConversation: Inbox;
  getConversationName: (inbox: Inbox) => string;
  getAvatar: (inbox: Inbox) => string;
  messages: Message[];
  pinnedMessages?: string[]; // Array of pinned message IDs
  onClose: () => void;
  onUpdateGroupName?: (newGroupTitle: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  currentUserId?: string;
  isOpen: boolean;
}

export const InboxSideDetails: React.FC<InboxSideDetailsProps> = ({
  selectedConversation,
  getConversationName,
  getAvatar,
  messages,
  pinnedMessages = [],
  onClose,
  onUpdateGroupName,
  onJumpToMessage,
  currentUserId = "user1",
  isOpen,
}) => {
  const isGroup = Boolean(
    selectedConversation.is_group ||
      selectedConversation.conversation_type === "group"
  );
  const name = getConversationName(selectedConversation);
  const avatar = getAvatar(selectedConversation);

  // Accordion Expand States
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(true);
  const [isMembersOpen, setIsMembersOpen] = useState(true);
  const [isPinnedOpen, setIsPinnedOpen] = useState(true);
  const [isLinksOpen, setIsLinksOpen] = useState(true);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(true);

  // Group Name Edit States
  const [isEditingName, setIsEditingName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState(name);

  // 1. Collect Pinned Messages
  const pinnedList = messages.filter((m) => pinnedMessages.includes(m._id));

  // 2. Extract Shared Links (from message text regex and links array)
  const extractedLinks = messages.flatMap((m) => {
    const textLinks =
      m.message_content?.match(/https?:\/\/[^\s]+/g) || [];
    const directLinks = m.links || [];
    return Array.from(new Set([...textLinks, ...directLinks])).map((url) => ({
      messageId: m._id,
      url,
    }));
  });

  // 3. Collect all media and file attachments
  const attachments = messages.flatMap((m) => m.attachments || []);

  const creatorId = selectedConversation.creator_id || currentUserId;
  const isCreatorSelf = creatorId === currentUserId;
  const memberList = selectedConversation.members || [currentUserId];

  const handleSaveGroupName = () => {
    const trimmed = customNameInput.trim();
    if (trimmed && onUpdateGroupName) {
      onUpdateGroupName(trimmed);
    }
    setIsEditingName(false);
  };

  return (
    <div
      className={`h-full bg-[#0d0f1a] border-l border-white/10 flex flex-col flex-shrink-0 overflow-y-auto inbox-scroll-thin text-white transition-all duration-300 ease-in-out ${
        isOpen
          ? "w-72 md:w-80 opacity-100"
          : "w-0 opacity-0 overflow-hidden border-l-0"
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="w-72 md:w-80 flex flex-col h-full">
        {/* Header Close Bar */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-[#0d0f1a]/95 backdrop-blur-sm z-10">
          <h3 className="text-sm font-semibold text-zinc-300">Chat Details</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Profile / Group Info Header */}
        <div className="flex flex-col items-center p-6 border-b border-white/10 text-center">
          <div className="relative mb-3">
            <img
              src={avatar}
              alt={name}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-blue-500/30"
            />
            <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-[#0d0f1a]" />
          </div>
          <h2 className="text-base font-bold text-white mb-0.5">{name}</h2>
          <p className="text-xs text-zinc-400">
            {isGroup ? `${memberList.length} members` : "Active now"}
          </p>

          {isGroup && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 text-[11px] text-yellow-400">
              <Crown className="h-3 w-3" />
              <span>Created by {isCreatorSelf ? "You" : "Admin"}</span>
            </div>
          )}

          {!isGroup && (
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => console.log("Navigate to user profile")}
                className="flex flex-col items-center gap-1.5 text-zinc-300 hover:text-white transition group"
              >
                <div className="p-3 rounded-full bg-white/5 border border-white/10 group-hover:bg-blue-500 group-hover:border-blue-500 transition">
                  <User className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">Profile</span>
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Sections Container */}
        <div className="p-2 space-y-2 flex-1">
          {/* 1. Customize Chat (Group Rename) */}
          {isGroup && (
            <div className="rounded-xl overflow-hidden bg-white/5 border border-white/5">
              <button
                onClick={() => setIsCustomizeOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition"
              >
                <span>Customize Chat</span>
                {isCustomizeOpen ? (
                  <ChevronUp className="h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                )}
              </button>

              {isCustomizeOpen && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                    <span>Change Group Name</span>
                    {!isEditingName && (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="p-1 text-blue-400 hover:text-blue-300 transition"
                        title="Edit Group Name"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {isEditingName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customNameInput}
                        onChange={(e) => setCustomNameInput(e.target.value)}
                        className="flex-1 rounded-lg border border-blue-500/50 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                      <button
                        onClick={handleSaveGroupName}
                        className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-200 font-medium truncate bg-black/20 p-2 rounded-lg border border-white/5">
                      {name}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. Group Members Section */}
          {isGroup && (
            <div className="rounded-xl overflow-hidden bg-white/5 border border-white/5">
              <button
                onClick={() => setIsMembersOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span>Members ({memberList.length})</span>
                </div>
                {isMembersOpen ? (
                  <ChevronUp className="h-4 w-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                )}
              </button>

              {isMembersOpen && (
                <div className="p-2 border-t border-white/5 space-y-1 max-h-48 overflow-y-auto inbox-scroll-thin">
                  {memberList.map((memberId) => {
                    const isSelf = memberId === currentUserId;
                    const isAdmin = memberId === creatorId;
                    const memberName = isSelf ? "You" : `Member (${memberId})`;

                    return (
                      <div
                        key={memberId}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                              memberName
                            )}&background=6366f1&color=fff&bold=true`}
                            alt={memberName}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                          <span className="text-zinc-200 font-medium truncate">
                            {memberName}
                          </span>
                        </div>
                        {isAdmin && (
                          <span className="text-[10px] font-semibold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1">
                            <Crown className="h-2.5 w-2.5" /> Admin
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Pinned Messages Section */}
          <div className="rounded-xl overflow-hidden bg-white/5 border border-white/5">
            <button
              onClick={() => setIsPinnedOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-yellow-400" />
                <span>Pinned Messages ({pinnedList.length})</span>
              </div>
              {isPinnedOpen ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {isPinnedOpen && (
              <div className="p-2 border-t border-white/5 space-y-1.5 max-h-48 overflow-y-auto inbox-scroll-thin">
                {pinnedList.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-2">
                    No pinned messages
                  </p>
                ) : (
                  pinnedList.map((msg) => (
                    <div
                      key={msg._id}
                      onClick={() => onJumpToMessage?.(msg._id)}
                      className="p-2 rounded-lg bg-black/20 border border-white/5 hover:bg-white/5 transition cursor-pointer text-xs"
                    >
                      <p className="text-zinc-200 line-clamp-2">
                        {msg.message_content || "[Attachment]"}
                      </p>
                      <span className="text-[10px] text-yellow-400/80 mt-1 block">
                        Click to jump
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 4. Shared Links Section */}
          <div className="rounded-xl overflow-hidden bg-white/5 border border-white/5">
            <button
              onClick={() => setIsLinksOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-emerald-400" />
                <span>Shared Links ({extractedLinks.length})</span>
              </div>
              {isLinksOpen ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {isLinksOpen && (
              <div className="p-2 border-t border-white/5 space-y-1.5 max-h-48 overflow-y-auto inbox-scroll-thin">
                {extractedLinks.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-2">
                    No links shared yet
                  </p>
                ) : (
                  extractedLinks.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5 hover:bg-white/5 transition text-xs group"
                    >
                      <span className="text-blue-400 group-hover:underline truncate max-w-[85%]">
                        {item.url}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white flex-shrink-0" />
                    </a>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 5. Attachments Section */}
          <div className="rounded-xl overflow-hidden bg-white/5 border border-white/5">
            <button
              onClick={() => setIsAttachmentsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-blue-400" />
                <span>Attachments ({attachments.length})</span>
              </div>
              {isAttachmentsOpen ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {isAttachmentsOpen && (
              <div className="p-3 border-t border-white/5">
                {attachments.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-2">
                    No attachments shared yet
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto inbox-scroll-thin">
                    {attachments.map((a, i) => (
                      <div
                        key={a.attachment_id || i}
                        className="aspect-square rounded-lg overflow-hidden bg-black/40 border border-white/10 relative group"
                      >
                        {a.attachment_type === "video" ? (
                          <video
                            src={a.attachment_url}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <img
                            src={a.attachment_url}
                            alt="Attachment"
                            className="h-full w-full object-cover group-hover:scale-105 transition"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};