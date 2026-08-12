// src/components/ui/inbox/inbox_main.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  MoreHorizontal,
  Smile,
  Reply,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Flag,
  FileText,
  Video,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";

import type { Inbox, Message } from "./inbox_dataset";
import useChatState, { formatCallCardText } from "../chat_bubble/chat_state";

import { InboxTab } from "./inbox_components/inbox_tab";
import { InboxSearch } from "./inbox_components/inbox_search";
import { InboxDirect } from "./inbox_pages/inbox_direct";
import { InboxMarketplace } from "./inbox_pages/inbox_marketplace";
import { InboxPanelPage } from "./inbox_pages/inbox_panel_page";

import { InboxEmojiPicker, InboxReactionBadges } from "./inbox_functions/inbox_emoji_picker";
import {
  chatAttachmentUrl,
  uploadChatAttachment,
  useInboxUploadMedia,
} from "./inbox_functions/inbox_upload_image";
import {
  InboxUnsentMessage,
  type ExtendedMessage,
} from "./inbox_functions/inbox_unsend_message";
import {
  InboxReplyQuote,
  scrollToRepliedMessage,
} from "./inbox_functions/inbox_reply_message";
import { InboxReportModal } from "./inbox_functions/inbox_report_message";
import {
  InboxEditedBadge,
} from "./inbox_functions/inbox_edit_message";
import {
  InboxTimeOfMessage,
  shouldDisplayTimestamp,
} from "./inbox_functions/inbox_timeof_message";
import { ChatImagePreview } from "./inbox_functions/chat_image_preview";

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TYPING_ACCOUNTS: string[] = [];
const MESSAGE_PAGE_SIZE = 30;

interface ProfileIdentity {
  name?: string;
  username?: string;
  avatar_preset_url?: string;
}

const InboxMain = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useGlobalState();
  const currentUserId = String(user?.account_id || "");
  const inboxList = useChatState((state) => state.conversations);
  const activeConversationId = useChatState(
    (state) => state.activeConversationId
  );
  const selectedConversation =
    inboxList.find(
      (conversation) =>
        String(conversation._id) === String(activeConversationId)
    ) || null;
  const messages = useChatState((state) =>
    activeConversationId
      ? state.messagesByConversation[activeConversationId] || EMPTY_MESSAGES
      : EMPTY_MESSAGES
  );
  const loading = useChatState((state) => state.loadingConversations);
  const messageLoading = useChatState((state) =>
    activeConversationId
      ? Boolean(state.loadingMessages[activeConversationId])
      : false
  );
  const fetchConversations = useChatState(
    (state) => state.fetchConversations
  );
  const selectConversation = useChatState(
    (state) => state.selectConversation
  );
  const createGroup = useChatState((state) => state.createGroup);
  const sendMessage = useChatState((state) => state.sendMessage);
  const replyMessage = useChatState((state) => state.replyMessage);
  const editMessage = useChatState((state) => state.editMessage);
  const deleteMessage = useChatState((state) => state.deleteMessage);
  const reactMessage = useChatState((state) => state.reactMessage);
  const pinMessage = useChatState((state) => state.pinMessage);
  const startCall = useChatState((state) => state.startCall);
  const renameConversation = useChatState(
    (state) => state.renameConversation
  );
  const updateGroupMember = useChatState((state) => state.updateGroupMember);
  const removeGroupMember = useChatState((state) => state.removeGroupMember);
  const updateGroupProfileImage = useChatState(
    (state) => state.updateGroupProfileImage
  );
  const setTyping = useChatState((state) => state.setTyping);
  const typingAccounts = useChatState((state) =>
    activeConversationId
      ? state.typingByConversation[activeConversationId] ||
        EMPTY_TYPING_ACCOUNTS
      : EMPTY_TYPING_ACCOUNTS
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ProfileIdentity>>({});
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [visibleMessageCount, setVisibleMessageCount] =
    useState(MESSAGE_PAGE_SIZE);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Left Sidebar Compact Collapse State (Switches to icon-only w-20 strip)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showChatDetails, setShowChatDetails] = useState(false);

  // Expanded Image Modal State
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; type: string } | null>(null);

  // Active Menu / Picker / Modal States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeEmojiPickerId, setActiveEmojiPickerId] = useState<string | null>(null);
  const [reportModalMessage, setReportModalMessage] = useState<Message | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousMessageCountRef = useRef(0);

  // Custom Hooks
  const {
    mediaList,
    fileInputRef,
    openFilePicker,
    handleFileChange,
    removeMedia,
    clearMedia,
  } = useInboxUploadMedia(3);

  const pinnedMessages = useMemo(
    () => selectedConversation?.pinned_messages || [],
    [selectedConversation]
  );
  const isPinned = useCallback(
    (messageId: string) =>
      pinnedMessages.some(
        (pinned) => String(pinned.message_id) === String(messageId)
      ),
    [pinnedMessages]
  );

  const formatTime = (dateString?: string | Date): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
    });
  };

  const getConversationName = useCallback(
    (inbox: Inbox): string => {
      if (inbox.conversation_type === "direct") {
        const other = inbox.members?.find(
          (member) => String(member.account_id) !== currentUserId
        );
        if (other) {
          return (
            profiles[String(other.account_id)]?.name ||
            inbox.conversation_name ||
            `User ${String(other.account_id).slice(0, 8)}`
          );
        }
        if (
          inbox.members?.some(
            (member) => String(member.account_id) === currentUserId
          )
        ) {
          return (
            profiles[currentUserId]?.name ||
            user?.name ||
            user?.display_name ||
            user?.handle ||
            "My Conversation"
          );
        }
      }
      return (
        inbox.conversation_name ||
        inbox.listing_title ||
        (inbox.conversation_type === "group" ? "Group Chat" : "Conversation")
      );
    },
    [currentUserId, profiles, user]
  );

  const getAvatar = useCallback(
    (inbox: Inbox): string => {
      if (inbox.conversation_image_key) {
        return chatAttachmentUrl(inbox.conversation_image_key);
      }
      if (inbox.conversation_type === "direct") {
        const other = inbox.members?.find(
          (member) => String(member.account_id) !== currentUserId
        );
        const avatar = other
          ? profiles[String(other.account_id)]?.avatar_preset_url
          : profiles[currentUserId]?.avatar_preset_url ||
            user?.avatar_preset_url ||
            user?.avatar_url;
        if (avatar) {
          if (/^https?:\/\//i.test(avatar)) return avatar;
          const base = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(
            /\/$/,
            ""
          );
          return base ? `${base}/${avatar.replace(/^\/+/, "")}` : avatar;
        }
      }
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        getConversationName(inbox)
      )}&background=6366f1&color=fff&bold=true`;
    },
    [currentUserId, getConversationName, profiles, user]
  );

  const loadInbox = useCallback(async () => {
    setConversationError(null);
    try {
      await fetchConversations();
    } catch (error) {
      console.error("Unable to load inbox:", error);
      setConversationError("Unable to load conversations.");
    }
  }, [fetchConversations]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  const memberIds = useMemo(
    () =>
      Array.from(
        new Set(
          inboxList.flatMap((inbox) =>
            (inbox.members || [])
              .map((member) => String(member.account_id))
              .filter((accountId) => accountId && accountId !== currentUserId)
          )
        )
      ),
    [currentUserId, inboxList]
  );
  const profileAccountIds = useMemo(
    () =>
      Array.from(
        new Set(
          inboxList.flatMap((inbox) =>
            (inbox.members || [])
              .map((member) => String(member.account_id))
              .filter(Boolean)
          )
        )
      ),
    [inboxList]
  );
  const profileAccountIdSignature = profileAccountIds.join(",");
  const suggestedAccounts = useMemo(
    () =>
      memberIds.map((accountId) => {
        const profile = profiles[accountId] || {};
        const name = profile.name || `User ${accountId.slice(0, 8)}`;
        return {
          account_id: accountId,
          name,
          username: profile.username ? `@${profile.username}` : "",
          avatar:
            profile.avatar_preset_url &&
            /^https?:\/\//i.test(profile.avatar_preset_url)
              ? profile.avatar_preset_url
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
        };
      }),
    [memberIds, profiles]
  );

  useEffect(() => {
    if (!profileAccountIdSignature) return;
    let cancelled = false;
    const missingIds = profileAccountIds.filter(
      (accountId) => !profiles[accountId]
    );
    if (missingIds.length === 0) return;
    void Promise.all(
      missingIds.map(async (accountId) => {
        try {
          const response = await api.get(`/api/accounts/profile/${accountId}`);
          return [accountId, response.data?.data || response.data] as const;
        } catch {
          return [accountId, {}] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) {
        setProfiles((current) => ({ ...current, ...Object.fromEntries(entries) }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profileAccountIdSignature, profileAccountIds, profiles]);

  const isMarketplace = location.pathname.includes("/marketplace");
  const tabConversations = useMemo(
    () =>
      inboxList.filter((inbox) =>
        isMarketplace
          ? inbox.conversation_type === "engagement"
          : ["direct", "group", "ticket", "dispute"].includes(
              inbox.conversation_type
            )
      ),
    [inboxList, isMarketplace]
  );

  const handleSelectConversation = useCallback(
    async (conversation: Inbox) => {
      setMessageError(null);
      try {
        await selectConversation(String(conversation._id));
      } catch (error) {
        console.error("Unable to load messages:", error);
        setMessageError("Unable to load messages.");
      }
    },
    [selectConversation]
  );

  useEffect(() => {
    const requestedConversationId = String(
      (location.state as { conversationId?: string } | null)?.conversationId ||
        ""
    );
    const activeIsVisible = tabConversations.some(
      (conversation) => String(conversation._id) === String(activeConversationId)
    );
    if (
      requestedConversationId &&
      String(activeConversationId) !== requestedConversationId
    ) {
      void selectConversation(requestedConversationId)
        .then(() => {
          navigate(location.pathname, { replace: true, state: null });
        })
        .catch((error: unknown) => {
          console.error("Unable to open requested conversation:", error);
          setMessageError("Unable to open this conversation.");
        });
      return;
    } else if (requestedConversationId) {
      navigate(location.pathname, { replace: true, state: null });
      return;
    } else if (!activeIsVisible && tabConversations[0]) {
      void handleSelectConversation(tabConversations[0]);
    }
  }, [
    activeConversationId,
    handleSelectConversation,
    location.state,
    location.pathname,
    navigate,
    selectConversation,
    tabConversations,
  ]);

  useEffect(() => {
    if (!activeConversationId) return;
    const timeout = setTimeout(
      () => endRef.current?.scrollIntoView({ behavior: "auto" }),
      50
    );
    return () => clearTimeout(timeout);
  }, [activeConversationId, messages.length]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tabConversations;
    return tabConversations.filter((inbox) =>
      [
        getConversationName(inbox),
        inbox.last_message,
        inbox.listing_title,
        inbox.listing_preview,
      ].some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [tabConversations, searchQuery, getConversationName]);

  const visibleConversations = useMemo(() => {
    if (!selectedConversation) return filteredConversations;

    const selectedBelongsToTab = isMarketplace
      ? selectedConversation.conversation_type === "engagement"
      : ["direct", "group", "ticket", "dispute"].includes(
          selectedConversation.conversation_type
        );

    if (!selectedBelongsToTab) return filteredConversations;

    const selectedIsAlreadyVisible = filteredConversations.some(
      (conversation) =>
        String(conversation._id) === String(selectedConversation._id)
    );

    if (selectedIsAlreadyVisible) return filteredConversations;

    return [selectedConversation, ...filteredConversations];
  }, [filteredConversations, isMarketplace, selectedConversation]);

  useEffect(() => {
    setVisibleMessageCount(MESSAGE_PAGE_SIZE);
    previousMessageCountRef.current = activeConversationId
      ? useChatState.getState().messagesByConversation[activeConversationId]
          ?.length || 0
      : 0;
    setMessageError(null);
  }, [activeConversationId]);

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;
    if (previousCount > 0 && messages.length > previousCount) {
      setVisibleMessageCount((count) => count + messages.length - previousCount);
    }
    previousMessageCountRef.current = messages.length;
  }, [messages.length]);

  const visibleMessages = useMemo(
    () =>
      messages.slice(
        Math.max(0, messages.length - Math.min(visibleMessageCount, messages.length))
      ),
    [messages, visibleMessageCount]
  );
  const latestSeenOwnMessageId = useMemo(
    () =>
      [...visibleMessages]
        .reverse()
        .find(
          (message) =>
            String(message.sender_id) === currentUserId &&
            (message.read_by || []).some(
              (reader) => String(reader.account_id) !== currentUserId
            )
        )?._id,
    [currentUserId, visibleMessages]
  );
  const hasOlderMessages = visibleMessageCount < messages.length;

  const handleLoadOlder = useCallback(() => {
    if (!hasOlderMessages || loadingOlder) return;
    const container = containerRef.current;
    const previousHeight = container?.scrollHeight || 0;
    setLoadingOlder(true);
    setVisibleMessageCount((count) =>
      Math.min(messages.length, count + MESSAGE_PAGE_SIZE)
    );
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop += container.scrollHeight - previousHeight;
        }
        setLoadingOlder(false);
      });
    });
  }, [hasOlderMessages, loadingOlder, messages.length]);

  const handleScroll = useCallback(() => {
    if ((containerRef.current?.scrollTop || 0) <= 80) handleLoadOlder();
  }, [handleLoadOlder]);

  // Group creation handler
  const handleCreateGroup = async ({
    name,
    members,
  }: {
    name: string;
    members: Array<{ account_id: string; name: string; avatar: string }>;
  }) => {
    const group = await createGroup(
      name,
      members.map((member) => ({ account_id: member.account_id }))
    );
    await handleSelectConversation(group);
  };

  // Group title update handler
  const handleUpdateGroupName = (newGroupTitle: string) => {
    if (!selectedConversation) return;
    void renameConversation(selectedConversation._id, newGroupTitle);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && mediaList.length === 0) return;
    if (!selectedConversation || isSending) return;

    if (editingMessage) {
      setIsSending(true);
      try {
        await editMessage(editingMessage._id, messageInput);
        setEditingMessage(null);
        setMessageInput("");
      } finally {
        setIsSending(false);
      }
      return;
    }

    setIsSending(true);
    try {
      const attachments = await Promise.all(
        mediaList.map(uploadChatAttachment)
      );
      if (replyToMessage) {
        await replyMessage(
          selectedConversation._id,
          replyToMessage._id,
          messageInput,
          attachments
        );
      } else {
        await sendMessage(selectedConversation._id, messageInput, attachments);
      }

      setMessageInput("");
      setReplyToMessage(null);
      clearMedia();
      setTyping(selectedConversation._id, false);
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (error) {
      console.error("Unable to send message:", error);
      setMessageError("Unable to send message or attachment.");
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    const message = messages.find(
      (candidate) => String(candidate._id) === String(messageId)
    );
    const remove = Boolean(
      message?.message_react?.some(
        (reaction) =>
          String(reaction.account_id) === currentUserId &&
          reaction.react_type === emoji
      )
    );
    void reactMessage(messageId, emoji, remove);
    setActiveEmojiPickerId(null);
  };

  const handleMessageInputChange = (value: string) => {
    setMessageInput(value);
    if (!selectedConversation) return;
    setTyping(selectedConversation._id, value.trim().length > 0);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(
      () => setTyping(selectedConversation._id, false),
      1500
    );
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (activeConversationId) {
        setTyping(activeConversationId, false);
      }
    };
  }, [activeConversationId, setTyping]);

  const handleUnsend = (messageId: string) => {
    void deleteMessage(messageId);
    setActiveMenuId(null);
  };

  const handleReply = (message: Message) => {
    setReplyToMessage(message);
    setEditingMessage(null);
    setActiveEmojiPickerId(null);
    setActiveMenuId(null);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleJumpToMessage = (messageId: string) => {
    scrollToRepliedMessage(containerRef, messageId);
  };

  const handleReportSubmit = async (reportData: {
    messageId: string;
    reason: string;
    details: string;
  }) => {
    await api.post(`/api/inbox/message/${reportData.messageId}/report`, {
      reason: reportData.reason,
      details: reportData.details,
    });
  };

  const renderMessage = (message: ExtendedMessage, index: number) => {
    const isSender = String(message.sender_id) === currentUserId;
    const isMenuOpen = activeMenuId === message._id;
    const isPickerOpen = activeEmojiPickerId === message._id;
    const pinned = isPinned(message._id);
    const hasRestrictedMessageTools = ["ticket", "dispute"].includes(
      String(selectedConversation?.conversation_type || "").toLowerCase()
    );
    const isUnsent = message.is_unsent;
    const attachments = message.attachments || [];
    const hasText = Boolean(message.message_content && message.message_content.trim());
    const isCallCard = /^(?:\[video-call:(?:missed|ended)\]|\[meeting:(?:requested|ended):[^\]]+\]|\[zoom-call:(?:started|ended):[^\]]+\])/.test(
      message.message_content || ""
    );
    const callCardText = formatCallCardText(message.message_content);

    const previousMessage = index > 0 ? visibleMessages[index - 1] : undefined;
    const showTime = shouldDisplayTimestamp(
      message.created_at,
      previousMessage?.created_at
    );

    const isSeen = (message.read_by || []).some(
      (reader) => String(reader.account_id) !== currentUserId
    );
    const messageStatus: "sent" | "seen" = isSeen ? "seen" : "sent";
    const recipientAvatar = selectedConversation
      ? getAvatar(selectedConversation)
      : undefined;
    const isGroupMessage = ["group", "ticket", "dispute"].includes(
      selectedConversation?.conversation_type || ""
    );
    const isTicketMessage =
      selectedConversation?.conversation_type === "ticket";
    const groupSeenAvatars = isGroupMessage
      ? Array.from(
          new Set(
            (message.read_by || [])
              .map((reader) => String(reader.account_id))
              .filter((accountId) => accountId !== currentUserId)
          )
        ).map((accountId) => {
          const profile = profiles[accountId];
          const avatar = profile?.avatar_preset_url;
          if (avatar && /^https?:\/\//i.test(avatar)) return avatar;
          if (avatar) {
            const base = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
            if (base) return `${base}/${avatar.replace(/^\/+/, "")}`;
          }
          return `https://ui-avatars.com/api/?name=${encodeURIComponent(
            profile?.name || `User ${accountId.slice(0, 8)}`
          )}&background=6366f1&color=fff`;
        })
      : [];
    const senderProfile = profiles[String(message.sender_id)];
    const senderMembership = selectedConversation?.members?.find(
      (member) => String(member.account_id) === String(message.sender_id)
    );
    const isTicketStaff =
      isTicketMessage &&
      ["admin", "staff", "moderator"].includes(
        String(senderMembership?.role || message.author_type || "").toLowerCase()
      );
    const senderName = isSender
      ? "You"
      : isTicketStaff
      ? "Staff"
      : message.author_name ||
        senderProfile?.name ||
        `User ${String(message.sender_id).slice(0, 8)}`;
    const senderAvatar = (() => {
      const avatar = senderProfile?.avatar_preset_url;
      if (avatar && /^https?:\/\//i.test(avatar)) return avatar;
      const base = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(
        /\/$/,
        ""
      );
      if (avatar && base) return `${base}/${avatar.replace(/^\/+/, "")}`;
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        senderName
      )}&background=6366f1&color=fff`;
    })();

    if (message.message_type === "system") {
      return (
        <div
          key={message._id}
          data-message-id={message._id}
          className="my-4 flex justify-center"
        >
          <span className="rounded-full bg-white/5 px-4 py-1.5 text-xs text-zinc-500">
            {message.message_content}
          </span>
        </div>
      );
    }

    return (
      <div
        key={message._id}
        data-message-id={message._id}
        className={`group relative flex items-center gap-2 my-2 ${
          isSender ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {isGroupMessage && !isSender && (
          <img
            src={senderAvatar}
            alt={senderName}
            className="h-8 w-8 flex-shrink-0 self-end rounded-full object-cover"
          />
        )}
        {isUnsent ? (
          <InboxUnsentMessage isSender={isSender} />
        ) : (
          <>
            <div className="relative max-w-[75%] flex flex-col">
              {isGroupMessage && (
                <span
                  className={`mb-1 px-1 text-[11px] font-medium text-zinc-400 ${
                    isSender ? "self-end" : "self-start"
                  }`}
                >
                  {senderName}
                </span>
              )}
              {pinned && !hasRestrictedMessageTools && (
                <div
                  className={`flex items-center gap-1 text-[11px] font-medium text-yellow-400 mb-1 ${
                    isSender ? "self-end" : "self-start"
                  }`}
                >
                  <Pin className="h-3 w-3 fill-yellow-400/20 text-yellow-400" />
                  <span>Pinned Message</span>
                </div>
              )}

              <div
                className={`relative rounded-2xl shadow-sm ${
                  hasText ? "px-4 py-2.5" : "p-1.5"
                } ${
                  isSender
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none"
                    : "bg-white/10 text-white rounded-bl-none border border-white/5"
                } ${pinned ? "ring-1 ring-yellow-400/40" : ""}`}
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {message.message_id_reply && (
                  <InboxReplyQuote
                    replyToMessageId={message.message_id_reply}
                    messages={messages}
                    currentUserId={currentUserId}
                    onJumpToReply={handleJumpToMessage}
                  />
                )}

                {attachments.length > 0 && (
                  <div
                    className={`gap-1.5 grid ${
                      hasText ? "mb-2" : ""
                    } ${
                      attachments.length === 1
                        ? "grid-cols-1 w-64 md:w-72"
                        : attachments.length === 2
                        ? "grid-cols-2 w-72 md:w-80"
                        : "grid-cols-3 w-80 md:w-96"
                    }`}
                  >
                    {attachments.map((a) => {
                      const attachmentKey =
                        a.attachment_key || a.attachment_url;
                      const attachmentUrl = chatAttachmentUrl(attachmentKey);
                      const isFile = a.attachment_type === "file";
                      return (
                        <div
                          key={a.attachment_id}
                          onClick={() =>
                            !isFile &&
                            setExpandedMedia({
                              url: attachmentUrl,
                              type: a.attachment_type,
                            })
                          }
                          className="relative min-h-20 w-full rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center cursor-pointer hover:opacity-90 transition"
                        >
                          {isFile ? (
                            <a
                              href={attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex w-full items-center gap-2 p-3 text-xs text-blue-200"
                            >
                              <FileText className="h-5 w-5 flex-shrink-0" />
                              <span className="truncate">
                                {a.attachment_name || "Download attachment"}
                              </span>
                            </a>
                          ) : a.attachment_type === "video" ? (
                            <video
                              src={attachmentUrl}
                              controls
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <img
                              src={attachmentUrl}
                              alt="Uploaded attachment"
                              className="w-full h-full object-cover rounded-xl block"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isCallCard ? (
                  <div className="min-w-48">
                    <div className="flex items-center gap-2 font-semibold">
                      <Video className="h-5 w-5" />
                      <span>{callCardText}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const peer = selectedConversation?.members?.find(
                          (member) =>
                            String(member.account_id) !== currentUserId
                        );
                        if (peer && selectedConversation) {
                          void startCall(
                            String(selectedConversation._id),
                            String(peer.account_id),
                            {
                              name: getConversationName(selectedConversation),
                              avatar: getAvatar(selectedConversation),
                            }
                          );
                        }
                      }}
                      className="mt-3 w-full rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/25"
                    >
                      Call back
                    </button>
                  </div>
                ) : hasText && (
                  <span className="whitespace-pre-wrap break-words block text-sm">
                    {message.message_content}
                  </span>
                )}

                {!hasRestrictedMessageTools && (
                  <InboxReactionBadges
                    reactions={message.message_react}
                    currentUserId={currentUserId}
                    isSender={isSender}
                    onToggleReaction={(emoji) => handleToggleReaction(message._id, emoji)}
                  />
                )}
              </div>

              {(showTime || message.is_edited || isSender) && (
                <div
                  className={`flex items-center gap-1.5 mt-2 px-1 ${
                    isSender ? "justify-end" : "justify-start"
                  }`}
                >
                  <InboxEditedBadge isEdited={message.is_edited} />
                  <InboxTimeOfMessage
                    timestamp={message.created_at}
                    isSender={isSender}
                    status={isSender ? messageStatus : undefined}
                    recipientAvatar={
                      isSender &&
                      selectedConversation?.conversation_type === "direct" &&
                      String(message._id) === String(latestSeenOwnMessageId) &&
                      isSeen
                        ? recipientAvatar
                        : undefined
                    }
                    recipientAvatars={
                      isSender &&
                      isGroupMessage &&
                      String(message._id) === String(latestSeenOwnMessageId) &&
                      isSeen
                        ? groupSeenAvatars
                        : undefined
                    }
                  />
                </div>
              )}
            </div>

            <div
              className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                isSender ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {!hasRestrictedMessageTools && <div className="relative">
                <button
                  onClick={() => {
                    setActiveEmojiPickerId(isPickerOpen ? null : message._id);
                    setActiveMenuId(null);
                  }}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                >
                  <Smile className="h-4 w-4" />
                </button>

                {isPickerOpen && (
                  <InboxEmojiPicker
                    isSender={isSender}
                    onSelectEmoji={(emoji) => handleToggleReaction(message._id, emoji)}
                    onClose={() => setActiveEmojiPickerId(null)}
                  />
                )}
              </div>}

              <button
                onClick={() => handleReply(message)}
                title="Reply"
                className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
              >
                <Reply className="h-4 w-4" />
              </button>

              <div className="relative">
                <button
                  onClick={() => {
                    setActiveMenuId(isMenuOpen ? null : message._id);
                    setActiveEmojiPickerId(null);
                  }}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {isMenuOpen && (
                  <div
                    className={`absolute bottom-full mb-2 ${
                      isSender ? "right-0" : "left-0"
                    } z-50 w-36 rounded-xl border border-white/10 bg-[#12141f] p-1 shadow-xl text-xs text-zinc-200`}
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {isSender && (
                      <>
                        <button
                          onClick={() => {
                            setEditingMessage(message);
                            setMessageInput(message.message_content);
                            setActiveMenuId(null);
                            textareaRef.current?.focus();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-white/10"
                        >
                          <Pencil className="h-3.5 w-3.5 text-emerald-400" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleUnsend(message._id)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Unsend
                        </button>
                      </>
                    )}
                    {!hasRestrictedMessageTools && <button
                      onClick={() => {
                        if (selectedConversation) {
                          void pinMessage(
                            selectedConversation._id,
                            message._id,
                            pinned
                          );
                        }
                        setActiveMenuId(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-white/10"
                    >
                      {pinned ? (
                        <>
                          <PinOff className="h-3.5 w-3.5 text-yellow-400" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="h-3.5 w-3.5 text-yellow-400" />
                          Pin
                        </>
                      )}
                    </button>}
                    {!isSender && (
                      <button
                        onClick={() => {
                          setReportModalMessage(message);
                          setActiveMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-zinc-300 hover:bg-white/10"
                      >
                        <Flag className="h-3.5 w-3.5 text-red-400" />
                        Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-[#080a12] flex flex-col overflow-hidden">
      <UserHeader pageTitle="Inbox" credits={1250} />

      <div className="w-full flex-1 min-h-0 overflow-hidden flex border-t border-white/10 relative">
        {/* Animated Left Conversation Sidebar (Transitions smoothly between w-80/w-96 and compact w-20) */}
        <div
          className={`flex-shrink-0 flex flex-col border-r border-white/10 bg-[#0d0f1a] transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? "w-20" : "w-80 md:w-96"
          }`}
        >
          <InboxTab
            onCreateGroup={handleCreateGroup}
            suggestedAccounts={suggestedAccounts}
            isCollapsed={isSidebarCollapsed}
          />
          <InboxSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab="direct"
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => {
              setIsSidebarCollapsed((collapsed) => {
                const next = !collapsed;
                if (!next) setShowChatDetails(false);
                return next;
              });
            }}
          />
          <div className="inbox-scroll-thin flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Navigate to="direct" replace />} />
              <Route
                path="direct"
                element={
                  <InboxDirect
                    conversations={visibleConversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={(conversation) =>
                      void handleSelectConversation(conversation)
                    }
                    loading={loading}
                    error={conversationError}
                    onRetry={() => void loadInbox()}
                    searchQuery={searchQuery}
                    getConversationName={getConversationName}
                    getAvatar={getAvatar}
                    getAccountName={(accountId) =>
                      profiles[accountId]?.name
                    }
                    formatTime={formatTime}
                    isCollapsed={isSidebarCollapsed}
                  />
                }
              />
              <Route
                path="marketplace"
                element={
                  <InboxMarketplace
                    conversations={visibleConversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={(conversation) =>
                      void handleSelectConversation(conversation)
                    }
                    loading={loading}
                    error={conversationError}
                    onRetry={() => void loadInbox()}
                    searchQuery={searchQuery}
                    getConversationName={getConversationName}
                    getAvatar={getAvatar}
                    getAccountName={(accountId) =>
                      profiles[accountId]?.name
                    }
                    formatTime={formatTime}
                    isCollapsed={isSidebarCollapsed}
                  />
                }
              />
            </Routes>
          </div>
        </div>

        {/* Main Panel Page */}
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative">
          <InboxPanelPage
            selectedConversation={selectedConversation}
            getConversationName={getConversationName}
            getAvatar={getAvatar}
            messages={messages}
            visibleMessages={visibleMessages}
            messageLoading={messageLoading}
            messageError={messageError}
            retryMessages={() =>
              selectedConversation &&
              void handleSelectConversation(selectedConversation)
            }
            hasOlderMessages={hasOlderMessages}
            loadingOlder={loadingOlder}
            onLoadOlder={handleLoadOlder}
            containerRef={containerRef}
            endRef={endRef}
            handleScroll={handleScroll}
            renderMessage={renderMessage}
            messageInput={messageInput}
            setMessageInput={handleMessageInputChange}
            handleSendMessage={handleSendMessage}
            isSending={isSending}
            typingCount={typingAccounts.length}
            replyToMessage={replyToMessage}
            editingMessage={editingMessage}
            cancelReply={() => {
              setReplyToMessage(null);
              setEditingMessage(null);
            }}
            mediaList={mediaList}
            fileInputRef={fileInputRef}
            openFilePicker={openFilePicker}
            handleFileChange={handleFileChange}
            removeMedia={removeMedia}
            pinnedMessages={pinnedMessages}
            onUnpin={(messageId: string) => {
              if (selectedConversation) {
                void pinMessage(selectedConversation._id, messageId, true);
              }
            }}
            onJumpToPinned={handleJumpToMessage}
            textareaRef={textareaRef}
            onUpdateGroupName={handleUpdateGroupName}
            currentUserId={currentUserId}
            getMemberName={(accountId: string) =>
              accountId === currentUserId
                ? "You"
                : profiles[accountId]?.name || `User ${accountId.slice(0, 8)}`
            }
            getMemberAvatar={(accountId: string) => {
              const avatar = profiles[accountId]?.avatar_preset_url;
              return avatar && /^https?:\/\//i.test(avatar)
                ? avatar
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    profiles[accountId]?.name || accountId.slice(0, 8)
                  )}&background=6366f1&color=fff`;
            }}
            suggestedAccounts={suggestedAccounts}
            onUpdateMember={(
              accountId: string,
              updates: {
                role?: "owner" | "admin" | "member";
                status?: "active" | "left" | "removed";
              }
            ) =>
              updateGroupMember(
                selectedConversation?._id || "",
                accountId,
                updates
              )
            }
            onRemoveMember={(accountId: string) =>
              removeGroupMember(selectedConversation?._id || "", accountId)
            }
            onUpdateGroupProfileImage={(imageKey: string) =>
              updateGroupProfileImage(
                selectedConversation?._id || "",
                imageKey
              )
            }
            showDetails={showChatDetails}
            onShowDetailsChange={(open: boolean) => {
              setShowChatDetails(open);
              if (open) setIsSidebarCollapsed(true);
            }}
            onPreviewAttachment={(url: string, type = "image") =>
              setExpandedMedia({ url, type })
            }
          />
        </div>
      </div>

      <ChatImagePreview
        url={expandedMedia?.url || null}
        type={expandedMedia?.type}
        onClose={() => setExpandedMedia(null)}
      />

      {reportModalMessage && (
        <InboxReportModal
          messageToReport={reportModalMessage}
          onClose={() => setReportModalMessage(null)}
          onSubmitReport={handleReportSubmit}
        />
      )}
    </div>
  );
};

export default InboxMain;
