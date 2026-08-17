// src/components/ui/inbox/inbox_functions/inbox_side_details.tsx
import React, { useEffect, useRef, useState } from "react";
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
  UserPlus,
  UserMinus,
  LogOut,
  Camera,
  Plus,
} from "lucide-react";
import type {
  Inbox,
  Members,
  Message,
  PinnedMessage,
} from "../inbox_dataset";
import type { SuggestedAccount } from "../inbox_functions/inbox_create_group";
import {
  chatAttachmentUrl,
  uploadChatAttachment,
} from "../inbox_functions/inbox_upload_image";
import api from "@/lib/axios";

interface InboxSideDetailsProps {
  selectedConversation: Inbox;
  getConversationName: (inbox: Inbox) => string;
  getAvatar: (inbox: Inbox) => string;
  messages: Message[];
  pinnedMessages?: PinnedMessage[];
  onClose: () => void;
  onUpdateGroupName?: (newGroupTitle: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  currentUserId: string;
  getMemberName?: (accountId: string) => string;
  getMemberAvatar?: (accountId: string) => string;
  onUpdateMember?: (
    accountId: string,
    updates: { role?: "owner" | "admin" | "member"; status?: "active" | "left" | "removed" }
  ) => Promise<Inbox>;
  onRemoveMember?: (accountId: string) => Promise<Inbox>;
  onUpdateGroupProfileImage?: (imageKey: string) => Promise<Inbox>;
  onPreviewAttachment?: (url: string, type?: string) => void;
  suggestedAccounts?: SuggestedAccount[];
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
  currentUserId,
  getMemberName = (accountId) => `User ${accountId.slice(0, 8)}`,
  getMemberAvatar = (accountId) =>
    `https://ui-avatars.com/api/?name=${accountId.slice(0, 8)}&background=6366f1&color=fff`,
  onUpdateMember,
  onRemoveMember,
  onUpdateGroupProfileImage,
  onPreviewAttachment,
  suggestedAccounts = [],
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
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<SuggestedAccount[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [isUploadingGroupImage, setIsUploadingGroupImage] = useState(false);
  const groupImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditingName) setCustomNameInput(name);
  }, [isEditingName, name]);

  // 1. Collect Pinned Messages
  const pinnedMessageIds = new Set(
    pinnedMessages.map((pinned) => String(pinned.message_id))
  );
  const hasRestrictedMessageTools = ["ticket", "dispute"].includes(
    String(selectedConversation.conversation_type || "").toLowerCase()
  );
  const pinnedList = messages.filter((message) =>
    pinnedMessageIds.has(String(message._id))
  );

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

  const owner = selectedConversation.members?.find((member) => member.role === "owner");
  const creatorId = selectedConversation.creator_id || owner?.account_id || currentUserId;
  const isCreatorSelf = creatorId === currentUserId;
  const memberList: Members[] = selectedConversation.members || [];
  const activeMembers = memberList.filter(
    (member) => !["left", "removed"].includes(member.status || "active")
  );
  const currentMember = memberList.find(
    (member) => String(member.account_id) === currentUserId
  );
  const isActiveMember =
    Boolean(currentMember) &&
    !["left", "removed"].includes(currentMember?.status || "active");
  const canManageMembers = ["owner", "admin"].includes(currentMember?.role || "");
  useEffect(() => {
    const query = memberSearch.replace(/^@/, "").trim();
    if (!showMemberSearch || query.length < 2) {
      setMemberSearchResults([]);
      setIsSearchingMembers(false);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsSearchingMembers(true);
      try {
        const response = await api.get("/api/accounts/search-users", {
          params: { handle: query },
        });
        const results = (response.data?.data || []).map((account: any) => ({
          account_id: String(account.account_id),
          name: account.display_name || account.handle,
          username: `@${account.handle}`,
          avatar: account.avatar_preset_url
            ? chatAttachmentUrl(account.avatar_preset_url)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                account.display_name || account.handle
              )}&background=6366f1&color=fff`,
        }));
        if (!cancelled) setMemberSearchResults(results);
      } catch {
        if (!cancelled) setMemberSearchResults([]);
      } finally {
        if (!cancelled) setIsSearchingMembers(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [memberSearch, showMemberSearch]);

  const handleGroupImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUpdateGroupProfileImage) return;
    setMemberActionError(null);
    setIsUploadingGroupImage(true);
    try {
      const uploaded = await uploadChatAttachment({
        id: `group-image-${Date.now()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        type: "image",
      });
      await onUpdateGroupProfileImage(uploaded.attachment_key);
    } catch (error) {
      setMemberActionError(
        error instanceof Error ? error.message : "Unable to update group image"
      );
    } finally {
      setIsUploadingGroupImage(false);
    }
  };

  const runMemberAction = async (action: () => Promise<Inbox>) => {
    setMemberActionError(null);
    try {
      await action();
    } catch (error) {
      setMemberActionError(
        error instanceof Error ? error.message : "Unable to update member"
      );
    }
  };

  const handleSaveGroupName = () => {
    const trimmed = customNameInput.trim();
    if (trimmed && onUpdateGroupName) {
      onUpdateGroupName(trimmed);
    }
    setIsEditingName(false);
  };

  return (
    <div
      className={`h-full bg-white dark:bg-dark-surface border-l border-gray-200 dark:border-white/10 flex flex-col flex-shrink-0 overflow-y-auto inbox-scroll-thin text-gray-900 dark:text-white transition-all duration-300 ease-in-out ${
        isOpen
          ? "w-72 md:w-80 opacity-100"
          : "w-0 opacity-0 overflow-hidden border-l-0"
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="w-72 md:w-80 flex flex-col h-full">
        {/* Header Close Bar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-white dark:bg-dark-surface/95 backdrop-blur-sm z-10">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-zinc-300">Chat Details</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-white/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Profile / Group Info Header */}
        <div className="flex flex-col items-center p-6 border-b border-gray-200 dark:border-white/10 text-center">
          <div className="relative mb-3">
            <img
              src={avatar}
              alt={name}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-blue-500/30"
            />
            {isGroup && isActiveMember ? (
              <>
                <input
                  ref={groupImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleGroupImageChange(event)}
                />
                <button
                  type="button"
                  disabled={isUploadingGroupImage}
                  onClick={() => groupImageInputRef.current?.click()}
                  className="absolute bottom-0 right-0 rounded-full bg-blue-600 p-2 text-gray-900 dark:text-white ring-2 ring-white dark:ring-dark-surface hover:bg-blue-500 disabled:opacity-50"
                  title="Change group image"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-dark-surface" />
            )}
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">{name}</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            {isGroup ? `${activeMembers.length} members` : "Active now"}
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
                className="flex flex-col items-center gap-1.5 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition group"
              >
                <div className="p-3 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 group-hover:bg-blue-500 group-hover:border-blue-500 transition">
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
            <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
              <button
                onClick={() => setIsCustomizeOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/5 transition"
              >
                <span>Customize Chat</span>
                {isCustomizeOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                )}
              </button>

              {isCustomizeOpen && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 mb-1">
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
                        className="flex-1 rounded-lg border border-blue-500/50 bg-black/40 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
                      />
                      <button
                        onClick={handleSaveGroupName}
                        className="p-1.5 rounded-lg bg-blue-600 text-gray-900 dark:text-white hover:bg-blue-500 transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-200 font-medium truncate bg-black/20 p-2 rounded-lg border border-gray-100 dark:border-white/5">
                      {name}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. Group Members Section */}
          {isGroup && (
            <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
              <div
                onClick={() => setIsMembersOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/5 transition"
              >
                <button type="button" className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span>Members ({activeMembers.length})</span>
                </button>
                <div className="flex items-center gap-1">
                  {isActiveMember && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowMemberSearch((open) => !open);
                        setIsMembersOpen(true);
                      }}
                      className="rounded-full p-1 text-blue-400 hover:bg-gray-100 dark:bg-white/10"
                      title="Add members"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                  {isMembersOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                  )}
                </div>
              </div>

              {isMembersOpen && (
                <div className="p-2 border-t border-gray-100 dark:border-white/5 space-y-1 max-h-48 overflow-y-auto inbox-scroll-thin">
                  {isActiveMember && showMemberSearch && (
                    <div className="mb-2 space-y-1.5">
                      <input
                        value={memberSearch}
                        onChange={(event) => setMemberSearch(event.target.value)}
                        placeholder="Search by @handle"
                        className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-[#171a27] p-2 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500"
                      />
                      {isSearchingMembers && (
                        <p className="px-2 text-[10px] text-gray-500 dark:text-zinc-500">Searching...</p>
                      )}
                      {memberSearchResults.map((account) => {
                        const existing = memberList.find(
                          (member) =>
                            String(member.account_id) === account.account_id
                        );
                        const isActive =
                          existing &&
                          !["left", "removed"].includes(
                            existing.status || "active"
                          );
                        return (
                          <button
                            key={account.account_id}
                            type="button"
                            disabled={Boolean(isActive)}
                            onClick={() =>
                              void runMemberAction(async () => {
                                const updated = await onUpdateMember!(
                                  account.account_id,
                                  { role: "member", status: "active" }
                                );
                                setMemberSearch("");
                                setMemberSearchResults([]);
                                return updated;
                              })
                            }
                            className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-gray-100 dark:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <img src={account.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs text-gray-900 dark:text-white">{account.name}</span>
                              <span className="block truncate text-[10px] text-gray-500 dark:text-zinc-500">{account.username}</span>
                            </span>
                            <span className="text-[10px] text-blue-400">
                              {isActive ? "Member" : existing ? "Re-add" : "Add"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {memberActionError && (
                    <p className="px-2 text-[10px] text-red-400">{memberActionError}</p>
                  )}
                  {memberList.map((member) => {
                    const memberId = String(member.account_id);
                    const isSelf = memberId === currentUserId;
                    const memberName = isSelf ? "You" : getMemberName(memberId);
                    const isInactive = ["left", "removed"].includes(
                      member.status || "active"
                    );

                    return (
                      <div
                        key={memberId}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:bg-white/5 transition text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getMemberAvatar(memberId)}
                            alt={memberName}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                          <span className="text-zinc-200 font-medium truncate">
                            {memberName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                            isInactive ? "bg-red-500/10 text-red-400" : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-zinc-400"
                          }`}>
                            {isInactive ? member.status : member.role}
                          </span>
                          {canManageMembers && member.role !== "owner" && (
                            <>
                              {isInactive ? (
                                <button
                                  title="Re-add member"
                                  onClick={() =>
                                    onUpdateMember &&
                                    void runMemberAction(() =>
                                      onUpdateMember(memberId, { status: "active" })
                                    )
                                  }
                                  className="p-1 text-emerald-400 hover:bg-gray-100 dark:bg-white/10"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <>
                                  <select
                                    value={member.role}
                                    onChange={(event) =>
                                      onUpdateMember &&
                                      void runMemberAction(() =>
                                        onUpdateMember(memberId, {
                                          role: event.target.value as "admin" | "member",
                                        })
                                      )
                                    }
                                    className="rounded bg-[#171a27] p-1 text-[9px]"
                                  >
                                    <option value="member">Member</option>
                                    {currentMember?.role === "owner" && (
                                      <option value="admin">Admin</option>
                                    )}
                                  </select>
                                  <button
                                    title="Remove member"
                                    onClick={() =>
                                      onRemoveMember &&
                                      void runMemberAction(() => onRemoveMember(memberId))
                                    }
                                    className="p-1 text-red-400 hover:bg-gray-100 dark:bg-white/10"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Pinned Messages Section */}
          {!hasRestrictedMessageTools && (
          <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
            <button
              onClick={() => setIsPinnedOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/5 transition"
            >
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-yellow-400" />
                <span>Pinned Messages ({pinnedList.length})</span>
              </div>
              {isPinnedOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
              )}
            </button>

            {isPinnedOpen && (
              <div className="p-2 border-t border-gray-100 dark:border-white/5 space-y-1.5 max-h-48 overflow-y-auto inbox-scroll-thin">
                {pinnedList.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-zinc-500 text-center py-2">
                    No pinned messages
                  </p>
                ) : (
                  pinnedList.map((msg) => (
                    <div
                      key={msg._id}
                      onClick={() => onJumpToMessage?.(msg._id)}
                      className="p-2 rounded-lg bg-black/20 border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:bg-white/5 transition cursor-pointer text-xs"
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
          )}

          {/* 4. Shared Links Section */}
          <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
            <button
              onClick={() => setIsLinksOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/5 transition"
            >
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-emerald-400" />
                <span>Shared Links ({extractedLinks.length})</span>
              </div>
              {isLinksOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
              )}
            </button>

            {isLinksOpen && (
              <div className="p-2 border-t border-gray-100 dark:border-white/5 space-y-1.5 max-h-48 overflow-y-auto inbox-scroll-thin">
                {extractedLinks.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-zinc-500 text-center py-2">
                    No links shared yet
                  </p>
                ) : (
                  extractedLinks.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:bg-white/5 transition text-xs group"
                    >
                      <span className="text-blue-400 group-hover:underline truncate max-w-[85%]">
                        {item.url}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-500 group-hover:text-gray-900 dark:text-white flex-shrink-0" />
                    </a>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 5. Attachments Section */}
          <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
            <button
              onClick={() => setIsAttachmentsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between p-3 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/5 transition"
            >
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-blue-400" />
                <span>Attachments ({attachments.length})</span>
              </div>
              {isAttachmentsOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
              )}
            </button>

            {isAttachmentsOpen && (
              <div className="p-3 border-t border-gray-100 dark:border-white/5">
                {attachments.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-zinc-500 text-center py-2">
                    No attachments shared yet
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto inbox-scroll-thin">
                    {attachments.map((a, i) => (
                      <div
                        key={a.attachment_id || i}
                        className="aspect-square rounded-lg overflow-hidden bg-black/40 border border-gray-200 dark:border-white/10 relative group"
                      >
                        {a.attachment_type === "file" ? (
                          <a
                            href={chatAttachmentUrl(
                              a.attachment_key || a.attachment_url
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-full w-full items-center justify-center p-2 text-center text-[9px] text-blue-300"
                          >
                            {a.attachment_name || "Attachment"}
                          </a>
                        ) : a.attachment_type === "video" ? (
                          <video
                            src={chatAttachmentUrl(
                              a.attachment_key || a.attachment_url
                            )}
                            className="h-full w-full object-cover"
                            onClick={() =>
                              onPreviewAttachment?.(
                                chatAttachmentUrl(
                                  a.attachment_key || a.attachment_url
                                ),
                                "video"
                              )
                            }
                          />
                        ) : (
                          <img
                            src={chatAttachmentUrl(
                              a.attachment_key || a.attachment_url
                            )}
                            alt="Attachment"
                            onClick={() =>
                              onPreviewAttachment?.(
                                chatAttachmentUrl(
                                  a.attachment_key || a.attachment_url
                                ),
                                "image"
                              )
                            }
                            className="h-full w-full cursor-pointer object-cover group-hover:scale-105 transition"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {isGroup &&
            currentMember?.role !== "owner" &&
            !["left", "removed"].includes(
              currentMember?.status || "active"
            ) && (
              <button
                type="button"
                onClick={() =>
                  onUpdateMember &&
                  void runMemberAction(() =>
                    onUpdateMember(currentUserId, { status: "left" })
                  )
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-400 hover:bg-red-500/15"
              >
                <LogOut className="h-4 w-4" />
                Leave group chat
              </button>
            )}
        </div>
      </div>
    </div>
  );
};
