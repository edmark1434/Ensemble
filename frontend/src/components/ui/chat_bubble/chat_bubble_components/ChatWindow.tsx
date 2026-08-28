import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Minus,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Send,
  Smile,
  Trash2,
  Video,
  X,
} from "lucide-react";
import useGlobalState from "@/lib/global_state";
import { useNavigate } from "react-router-dom";
import type { Message } from "@/components/ui/inbox/inbox_dataset";
import {
  chatAttachmentUrl,
  uploadChatAttachment,
  useInboxUploadMedia,
} from "@/components/ui/inbox/inbox_functions/inbox_upload_image";
import useChatState, { formatCallCardText, type ChatTarget } from "../chat_state";
import { InboxEmojiPicker } from "@/components/ui/inbox/inbox_functions/inbox_emoji_picker";
import { ChatImagePreview } from "@/components/ui/inbox/inbox_functions/chat_image_preview";
import LiveGoogleMeetingBanner from "./LiveGoogleMeetingBanner";
import { MarketplaceContextCard } from "@/components/ui/inbox/inbox_components/marketplace_context_card";

interface ChatWindowProps {
  onMinimize: () => void;
  onClose: () => void;
  activeUser: ChatTarget | null;
  messages?: Message[];
  isLoading?: boolean;
}

const REACTIONS = ["👍", "❤️", "😂", "😮"];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  onMinimize,
  onClose,
  activeUser,
  messages = [],
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const { user } = useGlobalState();
  const currentUserId = String(user?.account_id || "");
  const conversationId = String(activeUser?.inbox_id || activeUser?.id || "");
  const conversation = useChatState((state) =>
    state.conversations.find(
      (item) => String(item._id) === conversationId
    )
  );
  const typingCount = useChatState(
    (state) => state.typingByConversation[conversationId]?.length || 0
  );
  const isOnline = useChatState((state) =>
    activeUser?.account_id
      ? Boolean(state.onlineAccounts[String(activeUser.account_id)])
      : false
  );
  const sendMessage = useChatState((state) => state.sendMessage);
  const replyMessage = useChatState((state) => state.replyMessage);
  const editMessage = useChatState((state) => state.editMessage);
  const deleteMessage = useChatState((state) => state.deleteMessage);
  const reactMessage = useChatState((state) => state.reactMessage);
  const pinMessage = useChatState((state) => state.pinMessage);
  const setTyping = useChatState((state) => state.setTyping);
  const startCall = useChatState((state) => state.startCall);
  const activeCall = useChatState((state) => state.activeCall);
  const groupCall = useChatState(
    (state) => state.groupCallsByConversation[conversationId]
  );
  const liveGoogleMeeting = useChatState(
    (state) => state.googleMeetingsByConversation[conversationId]
  );
  const joinGroupCall = useChatState((state) => state.joinGroupCall);

  const [messageText, setMessageText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: string } | null>(null);
  const [showComposerEmojiPicker, setShowComposerEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const messageMenuRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    mediaList,
    fileInputRef,
    openFilePicker,
    handleFileChange,
    removeMedia,
    clearMedia,
  } = useInboxUploadMedia(3);

  const displayName = activeUser?.name || "Chat";
  const callTargetAccountId =
    activeUser?.account_id ||
    conversation?.members?.find(
      (member) =>
        String(member.account_id) !== currentUserId &&
        !["left", "removed"].includes(member.status || "active")
    )?.account_id;
  const isEngagement = conversation?.conversation_type === "engagement";
  const hasRestrictedMessageTools = ["ticket", "dispute"].includes(
    String(conversation?.conversation_type || "").toLowerCase()
  );
  const listingType =
    conversation?.listing_type ||
    (conversation?.gig_id ? "gig" : conversation?.job_id ? "job" : "");
  const listingPath =
    conversation?.listing_path ||
    (listingType === "gig" && conversation?.gig_id
      ? `/gigs/${conversation.gig_id}`
      : listingType === "job" && conversation?.job_id
      ? `/jobs/postings/${conversation.job_id}`
      : "");
  const pinnedIds = useMemo(
    () =>
      new Set(
        (conversation?.pinned_messages || []).map((item) =>
          String(item.message_id)
        )
      ),
    [conversation?.pinned_messages]
  );
  const latestSeenOwnMessageId = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message) =>
            String(message.sender_id) === currentUserId &&
            (message.read_by || []).some(
              (reader) => String(reader.account_id) !== currentUserId
            )
        )?._id,
    [currentUserId, messages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(
    () => () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (conversationId) setTyping(conversationId, false);
    },
    [conversationId, setTyping]
  );

  const closeMessageMenu = useCallback(() => {
    setActiveMenu(null);
    setMenuPosition(null);
    setReactionPickerMessageId(null);
  }, []);

  useEffect(() => {
    if (!activeMenu) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const targetElement = target instanceof Element ? target : null;
      if (
        messageMenuRef.current?.contains(target) ||
        targetElement?.closest(
          `[data-floating-menu-trigger="${activeMenu}"]`
        )
      ) {
        return;
      }
      closeMessageMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMessageMenu();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenu, closeMessageMenu]);

  const handleInput = (value: string) => {
    setMessageText(value);
    if (!conversationId) return;
    setTyping(conversationId, value.trim().length > 0);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(
      () => setTyping(conversationId, false),
      1500
    );
  };

  const handleSend = async () => {
    if (
      !conversationId ||
      isSending ||
      (!messageText.trim() && mediaList.length === 0)
    ) {
      return;
    }
    setIsSending(true);
    try {
      if (editing) {
        await editMessage(editing._id, messageText);
      } else {
        const attachments = await Promise.all(
          mediaList.map(uploadChatAttachment)
        );
        if (replyTo) {
          await replyMessage(
            conversationId,
            replyTo._id,
            messageText,
            attachments
          );
        } else {
          await sendMessage(conversationId, messageText, attachments);
        }
      }
      setMessageText("");
      setEditing(null);
      setReplyTo(null);
      clearMedia();
      setTyping(conversationId, false);
    } catch (error) {
      console.error("Unable to send chat message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const toggleReaction = async (message: Message, emoji: string) => {
    const remove = (message.message_react || []).some(
      (reaction) =>
        String(reaction.account_id) === currentUserId &&
        reaction.react_type === emoji
    );
    closeMessageMenu();
    await reactMessage(message._id, emoji, remove);
  };

  const beginEdit = (message: Message) => {
    setEditing(message);
    setReplyTo(null);
    setMessageText(message.message_content);
    closeMessageMenu();
  };

  const toggleMessageMenu = (
    messageId: string,
    button: HTMLButtonElement
  ) => {
    if (activeMenu === messageId) {
      closeMessageMenu();
      return;
    }
    const windowBounds = windowRef.current?.getBoundingClientRect();
    const buttonBounds = button.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 176;
    const padding = 8;
    const minLeft = (windowBounds?.left ?? 0) + padding;
    const maxLeft = Math.max(
      minLeft,
      (windowBounds?.right ?? window.innerWidth) - menuWidth - padding
    );
    const left = Math.min(
      Math.max(buttonBounds.left - menuWidth / 2, minLeft),
      maxLeft
    );
    const preferredTop = buttonBounds.top - menuHeight - 4;
    const minTop = (windowBounds?.top ?? 0) + padding;
    const maxTop = Math.max(
      minTop,
      (windowBounds?.bottom ?? window.innerHeight) - menuHeight - padding
    );
    const top =
      preferredTop >= minTop
        ? Math.min(preferredTop, maxTop)
        : Math.min(buttonBounds.bottom + 4, maxTop);
    setMenuPosition({ left, top });
    setActiveMenu(messageId);
    setReactionPickerMessageId(null);
  };

  const insertComposerEmoji = (emoji: string) => {
    const input = messageInputRef.current;
    const start = input?.selectionStart ?? messageText.length;
    const end = input?.selectionEnd ?? start;
    const nextValue =
      messageText.slice(0, start) + emoji + messageText.slice(end);
    const nextCursor = start + emoji.length;
    handleInput(nextValue);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <div ref={windowRef} className="flex h-[480px] w-[330px] flex-col overflow-hidden rounded-t-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-2xl sm:w-[360px]">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 p-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative flex-shrink-0">
            {displayName === "User" || (displayName.startsWith("User ") && displayName.length === 13) ? (
              <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            ) : (
              <img
                src={
                  activeUser?.avatarUrl
                    ? chatAttachmentUrl(activeUser.avatarUrl)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`
                }
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover"
              />
            )}
            <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900 ${isOnline ? "bg-green-500" : "bg-zinc-400 dark:bg-zinc-600"}`} />
          </div>
          <div className="min-w-0 flex-1">
            {displayName === "User" || (displayName.startsWith("User ") && displayName.length === 13) ? (
              <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded mb-1" />
            ) : (
              <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{displayName}</p>
            )}
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {typingCount ? "Typing..." : isOnline ? "Active now" : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {!hasRestrictedMessageTools && callTargetAccountId &&
            String(callTargetAccountId) !== currentUserId && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void startCall(conversationId, String(callTargetAccountId), {
                  name: displayName,
                  avatar: activeUser?.avatarUrl || "",
                });
              }}
              disabled={Boolean(activeCall)}
              title="Request a meeting"
              className="p-1.5 text-blue-500 transition-colors hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40"
            >
              <Video size={16} />
            </button>
          )}
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMinimize(); }} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white relative z-10 cursor-pointer">
            <Minus size={16} />
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white relative z-10 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      </div>

      {liveGoogleMeeting && <LiveGoogleMeetingBanner call={liveGoogleMeeting} compact />}

      {conversation?.conversation_type === "revision" && (
        <MarketplaceContextCard
          conversation={conversation}
          currentUserId={currentUserId}
        />
      )}

      {conversation?.conversation_type === "group" && groupCall && (
        <div className="flex items-center justify-between gap-2 border-b border-green-500/20 bg-green-500/10 px-3 py-2">
          <span className="truncate text-[10px] text-green-200">
            {groupCall.participant_names.length <= 2
              ? `${groupCall.participant_names.join(", ")} still in the call`
              : `${groupCall.participant_names.slice(0, 2).join(", ")} and ${
                  groupCall.participant_names.length - 2
                } others are still in the call`}
          </span>
          <button
            type="button"
            disabled={Boolean(activeCall)}
            onClick={() => void joinGroupCall(conversationId)}
            className="rounded bg-green-500 px-2 py-1 text-[9px] font-semibold text-white disabled:opacity-50"
          >
            {activeCall?.conversationId === conversationId ? "In Call" : "Join"}
          </button>
        </div>
      )}

      {isEngagement && (
        <div className="border-b border-white/10 bg-blue-500/5 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase text-blue-400">
              {listingType || "engagement"}
            </span>
            {listingPath && (
              <button
                onClick={() => navigate(listingPath)}
                className="text-[10px] text-blue-400 hover:text-blue-300"
              >
                View Details
              </button>
            )}
          </div>
          <p className="mt-1 truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
            {conversation?.listing_title || displayName}
          </p>
          {conversation?.listing_preview && (
            <p className="truncate text-[10px] text-zinc-500">
              {conversation.listing_preview}
            </p>
          )}
        </div>
      )}

      <div
        onScroll={closeMessageMenu}
        className="flex-1 space-y-2 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-950 p-3 text-[13px]"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Start a conversation.
          </div>
        ) : (
          messages.map((message) => {
            const isMe = String(message.sender_id) === currentUserId;
            const isDeleted =
              message.is_deleted || message.is_unsent || Boolean(message.deleted_at);
            const parent = message.message_id_reply
              ? messages.find(
                  (item) => String(item._id) === String(message.message_id_reply)
                )
              : undefined;
            return (
              <div
                key={message._id}
                className={`group flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {!hasRestrictedMessageTools && pinnedIds.has(String(message._id)) && (
                  <span className="mb-1 flex items-center gap-1 text-[9px] text-yellow-400">
                    <Pin size={10} /> Pinned
                  </span>
                )}
                <div className={`flex max-w-[90%] items-center gap-1 ${isMe ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`relative max-w-[85%] break-words rounded-2xl px-3 py-2 leading-relaxed shadow-sm ${
                      isMe
                        ? "rounded-br-[4px] bg-blue-600 text-white"
                        : "rounded-bl-[4px] border border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-white/5 dark:bg-[#1f2230] dark:text-zinc-200"
                    }`}
                  >
                    {parent && (
                      <button
                        onClick={() =>
                          document
                            .querySelector(`[data-floating-message="${parent._id}"]`)
                            ?.scrollIntoView({ behavior: "smooth" })
                        }
                        className="mb-1 block w-full truncate rounded border-l-2 border-blue-300 bg-black/15 px-2 py-1 text-left text-[10px] opacity-80"
                      >
                        {parent.message_content || "Attachment"}
                      </button>
                    )}
                    <div data-floating-message={message._id}>
                      {isDeleted ? (
                        <span className="italic opacity-60">Message deleted</span>
                      ) : (
                        <>
                          {/^(?:\[video-call:(?:missed|ended)\]|\[meeting:(?:requested|ended):[^\]]+\]|\[zoom-call:(?:started|ended):[^\]]+\])/.test(
                            message.message_content || ""
                          ) ? (
                            <div className="min-w-40">
                              <div className="flex items-center gap-2 font-semibold">
                                <Video size={16} />
                                <span>
                                  {formatCallCardText(message.message_content)}
                                </span>
                              </div>
                              {activeUser?.account_id && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void startCall(
                                      conversationId,
                                      activeUser.account_id!,
                                      {
                                        name: displayName,
                                        avatar: activeUser.avatarUrl,
                                      }
                                    )
                                  }
                                  className="mt-2 w-full rounded-lg bg-white/15 px-3 py-1.5 text-[10px] font-semibold hover:bg-white/25"
                                >
                                  Call back
                                </button>
                              )}
                            </div>
                          ) : message.message_content && (
                            <p className="whitespace-pre-wrap break-words">
                              {message.message_content}
                            </p>
                          )}
                          {(message.attachments || []).map((attachment) => {
                            const key =
                              attachment.attachment_key ||
                              attachment.attachment_url;
                            const url = chatAttachmentUrl(key);
                            return attachment.attachment_type === "file" ? (
                              <a
                                key={attachment.attachment_id}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 flex items-center gap-2 rounded-lg bg-black/20 p-2 text-[10px]"
                              >
                                <FileText size={15} />
                                <span className="truncate">
                                  {attachment.attachment_name || "Attachment"}
                                </span>
                              </a>
                            ) : attachment.attachment_type === "video" ? (
                              <video
                                key={attachment.attachment_id}
                                src={url}
                                controls
                                onClick={() => setPreviewMedia({ url, type: "video" })}
                                className="mt-1 max-h-36 cursor-pointer rounded-lg"
                              />
                            ) : (
                              <img
                                key={attachment.attachment_id}
                                src={url}
                                alt="Attachment"
                                onClick={() => setPreviewMedia({ url, type: "image" })}
                                className="mt-1 max-h-40 cursor-zoom-in rounded-lg object-cover"
                              />
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                  {!isDeleted && (
                    <div className="relative opacity-0 transition group-hover:opacity-100">
                      <button
                        data-floating-menu-trigger={message._id}
                        onClick={(event) =>
                          toggleMessageMenu(message._id, event.currentTarget)
                        }
                        className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {activeMenu === message._id && menuPosition && createPortal(
                        <div
                          ref={messageMenuRef}
                          className="fixed z-[110] w-36 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 text-zinc-800 dark:text-zinc-200 shadow-xl"
                          style={menuPosition}
                        >
                          {!hasRestrictedMessageTools && (
                          <div className="relative border-b border-zinc-200 dark:border-zinc-800 pb-1">
                            <button
                              type="button"
                              onClick={() =>
                                setReactionPickerMessageId((current) =>
                                  current === message._id ? null : message._id
                                )
                              }
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              <Smile size={13} /> React
                            </button>
                            {reactionPickerMessageId === message._id && (
                              <InboxEmojiPicker
                                isSender={isMe}
                                onSelectEmoji={(emoji) =>
                                  void toggleReaction(message, emoji)
                                }
                                onClose={() => setReactionPickerMessageId(null)}
                              />
                            )}
                          </div>
                          )}
                          <div className="pt-1">
                            <button onClick={() => { setReplyTo(message); setEditing(null); closeMessageMenu(); }} className="flex w-full gap-2 rounded px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                              <Reply size={13} /> Reply
                            </button>
                            {!hasRestrictedMessageTools && <button onClick={() => { closeMessageMenu(); void pinMessage(conversationId, message._id, pinnedIds.has(String(message._id))); }} className="flex w-full gap-2 rounded px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                              {pinnedIds.has(String(message._id)) ? <PinOff size={13} /> : <Pin size={13} />}
                              {pinnedIds.has(String(message._id)) ? "Unpin" : "Pin"}
                            </button>}
                            {isMe && (
                              <>
                                <button onClick={() => beginEdit(message)} className="flex w-full gap-2 rounded px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                  <Pencil size={13} /> Edit
                                </button>
                                <button onClick={() => { closeMessageMenu(); void deleteMessage(message._id); }} className="flex w-full gap-2 rounded px-2 py-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                                  <Trash2 size={13} /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                  )}
                </div>
                {!hasRestrictedMessageTools && (message.message_react || []).length > 0 && (
                  <div className="mt-0.5 flex gap-1">
                    {[...new Set(message.message_react.map((item) => item.react_type))].map(
                      (emoji) => (
                        <button
                          key={emoji}
                          onClick={() => void toggleReaction(message, emoji)}
                          className="rounded-full bg-white/10 px-1.5 text-[10px]"
                        >
                          {emoji}{" "}
                          {
                            message.message_react.filter(
                              (item) => item.react_type === emoji
                            ).length
                          }
                        </button>
                      )
                    )}
                  </div>
                )}
                <div className="mt-0.5 flex items-center gap-1 px-1 text-[9px] text-zinc-500">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {message.is_edited && " · edited"}
                  {isMe &&
                    String(message._id) === String(latestSeenOwnMessageId) &&
                    (message.read_by || []).some(
                      (reader) => String(reader.account_id) !== currentUserId
                    ) && (
                    <span className="flex -space-x-1" title="Seen">
                      {Array.from(
                        new Set(
                          (message.read_by || [])
                            .map((reader) => String(reader.account_id))
                            .filter((accountId) => accountId !== currentUserId)
                        )
                      )
                        .slice(0, 5)
                        .map((accountId) => {
                          const avatarKey = conversation?.avatarPayload?.[accountId];
                          const memberName =
                            conversation?.members?.find(
                              (member) => String(member.account_id) === accountId
                            )?.display_name || `User ${accountId.slice(0, 8)}`;
                          return (
                            <img
                              key={accountId}
                              src={
                                avatarKey
                                  ? chatAttachmentUrl(avatarKey)
                                  : conversation?.conversation_type === "direct" && activeUser?.avatarUrl
                                  ? chatAttachmentUrl(activeUser.avatarUrl)
                                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      memberName
                                    )}&background=6366f1&color=fff`
                              }
                              alt={`Seen by ${memberName}`}
                              className="h-3.5 w-3.5 rounded-full object-cover ring-1 ring-blue-400"
                            />
                          );
                        })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#111421] px-3 py-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-blue-400">Replying to:</span>
            <span className="truncate">{replyTo.message_content}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="ml-2 hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}

      {editing && (
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#111421] px-3 py-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-yellow-400">Editing Message</span>
          </div>
          <button onClick={cancelEdit} className="ml-2 hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}

      {mediaList.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-zinc-200 dark:border-white/10 px-3 py-2">
          {mediaList.map((media) => (
            <div key={media.id} className="relative flex h-20 min-w-20 max-w-40 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/10 text-[9px]">
              {media.type === "file" ? (
                <div className="flex w-36 items-center gap-2 px-2 text-zinc-700 dark:text-zinc-300">
                  <FileText size={18} className="flex-shrink-0" />
                  <span className="truncate">{media.file.name}</span>
                </div>
              ) : media.type === "video" ? (
                <video
                  src={media.previewUrl}
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={media.previewUrl}
                  alt={media.file.name}
                  className="h-full w-full object-cover"
                />
              )}
              <button onClick={() => removeMedia(media.id)} className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5"><X size={9} /></button>
            </div>
          ))}
        </div>
      )}
      {typingCount > 0 && (
        <div className="px-3 pt-1 text-[10px] text-zinc-500">Typing...</div>
      )}
      <div className="flex items-center gap-2 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 p-2.5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          onChange={handleFileChange}
          className="hidden"
        />
        <button onClick={openFilePicker} disabled={mediaList.length >= 3} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white disabled:opacity-40">
          <Paperclip size={16} />
        </button>
        <div className="relative flex flex-1 items-center gap-2 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.05] px-3.5 py-1.5">
          <input
            ref={messageInputRef}
            value={messageText}
            onChange={(event) => handleInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSend();
            }}
            placeholder={editing ? "Edit message" : replyTo ? "Write a reply" : "Aa"}
            className="w-full bg-transparent text-xs text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          <button
            type="button"
            onClick={() => setShowComposerEmojiPicker((open) => !open)}
            className="text-zinc-500 transition hover:text-zinc-800 dark:hover:text-white"
            aria-label="Choose emoji"
          >
            <Smile size={15} />
          </button>
          {showComposerEmojiPicker && (
            <InboxEmojiPicker
              isSender
              onSelectEmoji={insertComposerEmoji}
              onClose={() => setShowComposerEmojiPicker(false)}
            />
          )}
        </div>
        <button
          onClick={() => void handleSend()}
          disabled={isSending || (!messageText.trim() && mediaList.length === 0)}
          className="rounded-full bg-blue-600 p-2 text-white disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </div>
      <ChatImagePreview
        url={previewMedia?.url || null}
        type={previewMedia?.type}
        onClose={() => setPreviewMedia(null)}
      />
    </div>
  );
};
