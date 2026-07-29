// src/components/ui/inbox/inbox_main.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  MoreHorizontal,
  Smile,
  Reply,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Flag,
  X,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import useGlobalState from "@/lib/global_state";

import type { Inbox, Message, Attachment } from "./inbox_dataset";
import { DUMMY_INBOX_LIST, DUMMY_MESSAGES_MAP } from "./inbox_dataset";

import { InboxTab } from "./inbox_components/inbox_tab";
import { InboxSearch } from "./inbox_components/inbox_search";
import { InboxDirect } from "./inbox_pages/inbox_direct";
import { InboxMarketplace } from "./inbox_pages/inbox_marketplace";
import { InboxPanelPage } from "./inbox_pages/inbox_panel_page";

import { InboxEmojiPicker, InboxReactionBadges } from "./inbox_functions/inbox_emoji_picker";
import { useInboxUploadMedia } from "./inbox_functions/inbox_upload_image";
import { useInboxPinMessage } from "./inbox_functions/inbox_pin_message";
import {
  useInboxUnsendMessage,
  InboxUnsentMessage,
  type ExtendedMessage,
} from "./inbox_functions/inbox_unsend_message";
import {
  InboxReplyQuote,
  scrollToRepliedMessage,
} from "./inbox_functions/inbox_reply_message";
import { InboxReportModal } from "./inbox_functions/inbox_report_message";
import {
  useInboxEditMessage,
  InboxEditedBadge,
} from "./inbox_functions/inbox_edit_message";
import {
  InboxTimeOfMessage,
  shouldDisplayTimestamp,
} from "./inbox_functions/inbox_timeof_message";

const InboxMain = () => {
  const { user } = useGlobalState();
  const currentUserId = user?.account_id || "user1";

  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [inboxList, setInboxList] = useState<Inbox[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Inbox | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  // Expanded Image Modal State
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; type: string } | null>(null);

  // Active Menu / Picker / Modal States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeEmojiPickerId, setActiveEmojiPickerId] = useState<string | null>(null);
  const [reportModalMessage, setReportModalMessage] = useState<Message | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Custom Hooks
  const {
    mediaList,
    fileInputRef,
    openFilePicker,
    handleFileChange,
    removeMedia,
    clearMedia,
  } = useInboxUploadMedia(3);

  const { pinnedMessages, isPinned, togglePin, unpin } = useInboxPinMessage();
  const { unsendMessage } = useInboxUnsendMessage(setMessages);
  const { updateEditedMessage } = useInboxEditMessage(setMessages);

  const formatTime = (dateString?: string | Date): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const getConversationName = useCallback(
    (inbox: Inbox): string => inbox.conversation_name || "Chat",
    []
  );

  const getAvatar = useCallback(
    (inbox: Inbox): string =>
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        inbox.conversation_name || "User"
      )}&background=6366f1&color=fff&bold=true`,
    []
  );

  useEffect(() => {
    setLoading(true);
    setInboxList(DUMMY_INBOX_LIST);
    if (DUMMY_INBOX_LIST.length > 0) {
      setSelectedConversation(DUMMY_INBOX_LIST[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;
    setMessageLoading(true);
    const mockMessages = DUMMY_MESSAGES_MAP[selectedConversation._id] || [];
    setMessages(mockMessages);
    setMessageLoading(false);

    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "auto" });
    }, 50);
  }, [selectedConversation]);

  const filteredConversations = useMemo(() => {
    return inboxList.filter((inbox) =>
      getConversationName(inbox).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inboxList, searchQuery, getConversationName]);

  const handleSendMessage = () => {
    if (!messageInput.trim() && mediaList.length === 0) return;

    if (editingMessage) {
      updateEditedMessage(editingMessage._id, messageInput);
      setEditingMessage(null);
      setMessageInput("");
      return;
    }

    const attachments: Attachment[] = mediaList.map((m) => ({
      attachment_id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      attachment_type: m.type,
      attachment_url: m.previewUrl,
    }));

    const newMessage: Message = {
      _id: `msg-${Date.now()}`,
      conversation_id: selectedConversation?._id || "",
      sender_id: currentUserId,
      message_type: mediaList.length > 0 ? mediaList[0].type : "text",
      message_content: messageInput,
      message_id_reply: replyToMessage?._id || "",
      attachments,
      links: [],
      message_react: [],
      read_by: [], // Newly sent message starts with empty read array (Status: Sent)
      is_edited: false,
      deleted_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageInput("");
    setReplyToMessage(null);
    clearMedia();

    setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id !== messageId) return msg;

        const existing = msg.message_react || [];
        const reactedSame = existing.some(
          (r) => r.account_id === currentUserId && r.react_type === emoji
        );

        const withoutUser = existing.filter((r) => r.account_id !== currentUserId);

        return {
          ...msg,
          message_react: reactedSame
            ? withoutUser
            : [...withoutUser, { account_id: currentUserId, react_type: emoji }],
        };
      })
    );
    setActiveEmojiPickerId(null);
  };

  const handleUnsend = (messageId: string) => {
    unsendMessage(messageId);
    unpin(messageId);
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

  const handleReportSubmit = (reportData: {
    messageId: string;
    reason: string;
    details: string;
  }) => {
    console.log("Report submitted successfully:", reportData);
  };

  const renderMessage = (message: ExtendedMessage, index: number) => {
    const isSender = message.sender_id === currentUserId;
    const isMenuOpen = activeMenuId === message._id;
    const isPickerOpen = activeEmojiPickerId === message._id;
    const pinned = isPinned(message._id);
    const isUnsent = message.is_unsent;
    const attachments = message.attachments || [];
    const hasText = Boolean(message.message_content && message.message_content.trim());

    const previousMessage = index > 0 ? messages[index - 1] : undefined;
    const showTime = shouldDisplayTimestamp(
      message.created_at,
      previousMessage?.created_at
    );

    // Read / Sent Status Logic
    const isLastMessage = index === messages.length - 1;
    const isSeen = (message.read_by || []).length > 0;
    const messageStatus: "sent" | "seen" = isSeen ? "seen" : "sent";
    const recipientAvatar = selectedConversation
      ? getAvatar(selectedConversation)
      : undefined;

    return (
      <div
        key={message._id}
        data-message-id={message._id}
        className={`group relative flex items-center gap-2 my-2 ${
          isSender ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {isUnsent ? (
          <InboxUnsentMessage isSender={isSender} />
        ) : (
          <>
            <div className="relative max-w-[75%] flex flex-col">
              {pinned && (
                <div
                  className={`flex items-center gap-1 text-[11px] font-medium text-yellow-400 mb-1 ${
                    isSender ? "self-end" : "self-start"
                  }`}
                >
                  <Pin className="h-3 w-3 fill-yellow-400/20 text-yellow-400" />
                  <span>Pinned Message</span>
                </div>
              )}

              {/* Message Content Bubble */}
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

                {/* Media Attachments Grid */}
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
                    {attachments.map((a) => (
                      <div
                        key={a.attachment_id}
                        onClick={() => setExpandedMedia({ url: a.attachment_url, type: a.attachment_type })}
                        className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center cursor-pointer hover:opacity-90 transition"
                      >
                        {a.attachment_type === "video" ? (
                          <video
                            src={a.attachment_url}
                            controls
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <img
                            src={a.attachment_url}
                            alt="Uploaded attachment"
                            className="w-full h-full object-cover rounded-xl block"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {hasText && (
                  <span className="whitespace-pre-wrap break-words block text-sm">
                    {message.message_content}
                  </span>
                )}

                <InboxReactionBadges
                  reactions={message.message_react}
                  currentUserId={currentUserId}
                  isSender={isSender}
                  onToggleReaction={(emoji) => handleToggleReaction(message._id, emoji)}
                />
              </div>

              {/* Time & Sent/Seen Status Row */}
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
                      isSender && isLastMessage && isSeen
                        ? recipientAvatar
                        : undefined
                    }
                  />
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div
              className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                isSender ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div className="relative">
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
              </div>

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
                    <button
                      onClick={() => {
                        togglePin(message._id, currentUserId);
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
                    </button>
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

      <div className="w-full flex-1 min-h-0 overflow-hidden flex border-t border-white/10">
        <div className="w-80 md:w-96 flex-shrink-0 flex flex-col border-r border-white/10 bg-[#0d0f1a]">
          <InboxTab />
          <InboxSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeTab="direct"
          />
          <div className="inbox-scroll-thin flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Navigate to="direct" replace />} />
              <Route
                path="direct"
                element={
                  <InboxDirect
                    conversations={filteredConversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={setSelectedConversation}
                    loading={loading}
                    searchQuery={searchQuery}
                    getConversationName={getConversationName}
                    getAvatar={getAvatar}
                    formatTime={formatTime}
                  />
                }
              />
              <Route
                path="marketplace"
                element={
                  <InboxMarketplace
                    conversations={filteredConversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={setSelectedConversation}
                    loading={loading}
                    searchQuery={searchQuery}
                    getConversationName={getConversationName}
                    getAvatar={getAvatar}
                    formatTime={formatTime}
                  />
                }
              />
            </Routes>
          </div>
        </div>

        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
          <InboxPanelPage
            selectedConversation={selectedConversation}
            getConversationName={getConversationName}
            getAvatar={getAvatar}
            messages={messages}
            messageLoading={messageLoading}
            containerRef={containerRef}
            endRef={endRef}
            handleScroll={() => {}}
            renderMessage={renderMessage}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            handleSendMessage={handleSendMessage}
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
            onUnpin={unpin}
            onJumpToPinned={handleJumpToMessage}
            textareaRef={textareaRef}
          />
        </div>
      </div>

      {/* Expanded Image / Video Lightbox Modal */}
      {expandedMedia && (
        <div
          onClick={() => setExpandedMedia(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-[#12141f] border border-white/10 shadow-2xl flex items-center justify-center">
            <button
              onClick={() => setExpandedMedia(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-red-500/80 transition"
            >
              <X className="h-5 w-5" />
            </button>
            {expandedMedia.type === "video" ? (
              <video src={expandedMedia.url} controls autoPlay className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            ) : (
              <img src={expandedMedia.url} alt="Expanded Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            )}
          </div>
        </div>
      )}

      {/* Report Modal */}
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