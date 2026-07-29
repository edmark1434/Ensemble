// src/pages/user/inbox/Inbox.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Send,
  Paperclip,
  Video,
  MoreVertical,
  Search,
  UserPlus,
  ArrowLeft,
  CheckCheck,
  Share2,
  Users,
  Briefcase,
  Image,
  FileText,
  MoreHorizontal,
  Reply,
  Pin,
  Pencil,
  Trash2,
  X
} from "lucide-react";
import socket from "@/lib/socket";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";
import EmojiPicker, { EmojiStyle } from 'emoji-picker-react';

// ============================================================
// Types
// ============================================================
interface Members {
  account_id: string;
  role: string;
  joined_at: Date;
}

interface PinnedMessage {
  pinned_at: Date;
  pinned_by: string;
  message_id: string;
}

interface Attachment {
  attachment_id: string;
  attachment_type: string;
  attachment_url: string;
}

interface MessageReact {
  account_id: string;
  react_type: string;
}

interface ReadBy {
  account_id: string;
  read_at: Date;
}

interface Inbox {
  _id: string;
  conversation_name: string;
  conversation_type: string;
  contract_id: string;
  job_id: string;
  gig_id: string;
  members: Members[];
  pinned_messages: PinnedMessage[];
  created_at: Date;
  updated_at: Date;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

interface Message {
  _id: string;
  conversation_id: string;
  sender_id: number | string;
  message_type: string;
  message_content: string;
  message_id_reply: string;
  attachments: Attachment[];
  links: string[];
  message_react: MessageReact[];
  read_by: ReadBy[];
  is_edited: boolean;
  deleted_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface Profile {
  account_id: string;
  user_id?: string;
  name: string;
  email: string;
  avatar_preset_url?: string;
  avatar_file_id?: string;
  username?: string;
  [key: string]: any;
}

// ============================================================
// Constants
// ============================================================
const QUICK_REACTIONS = [
  "1f44d", // 👍
  "2764-fe0f", // ❤️
  "1f602", // 😂
  "1f62e", // 😮
  "1f622", // 😢
  "1f64f", // 🙏
];

const MENU_WIDTH = 280;
const MENU_HEIGHT = 380;
const MENU_MARGIN = 8;

// ============================================================
// Helper Functions
// ============================================================
const getAvatarUrl = (avatarPath?: string): string | null => {
  if (!avatarPath) return null;
  const base = import.meta.env.VITE_CLOUDFRONT_URL;
  return avatarPath.startsWith("/") ? `${base}${avatarPath}` : `${base}/${avatarPath}`;
};

const formatMessageTime = (dateString?: string | Date): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

const formatTime = (dateString?: string | Date): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getDateLabel = (dateKey: string) => {
  const date = new Date(dateKey);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
};

// ============================================================
// Reaction Logic Helper
// ============================================================
interface ReactionUpdate {
  action: 'add' | 'replace' | 'remove';
  emoji: string;
}

const getReactionUpdate = (
  message: Message,
  accountId: string,
  emoji: string
): ReactionUpdate => {
  const reacts = Array.isArray(message.message_react) ? message.message_react : [];
  const existing = reacts.find(r => r.account_id === accountId);

  if (!existing) {
    return { action: 'add', emoji };
  }
  
  if (existing.react_type === emoji) {
    return { action: 'remove', emoji };
  }
  
  return { action: 'replace', emoji };
};

const updateMessageReactions = (
  message: Message,
  accountId: string,
  emoji: string
): Message => {
  const reacts = Array.isArray(message.message_react) ? [...message.message_react] : [];
  const existingIndex = reacts.findIndex(r => r.account_id === accountId);

  // If no reaction -> add
  if (existingIndex === -1) {
    return {
      ...message,
      message_react: [...reacts, { account_id: accountId, react_type: emoji }]
    };
  }

  // If same emoji -> remove (toggle)
  if (reacts[existingIndex].react_type === emoji) {
    reacts.splice(existingIndex, 1);
    return { ...message, message_react: reacts };
  }

  // If different emoji -> replace
  reacts[existingIndex] = { account_id: accountId, react_type: emoji };
  return { ...message, message_react: reacts };
};

// ============================================================
// Hooks
// ============================================================
const useScrollManagement = (messages: Message[]) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollPositionRef = useRef<number>(0);

  const scrollToBottom = useCallback(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShouldAutoScroll(isAtBottom);
    scrollPositionRef.current = scrollTop;
  }, []);

  const saveScrollPosition = useCallback(() => {
    if (containerRef.current) {
      scrollPositionRef.current = containerRef.current.scrollTop;
    }
  }, []);

  const restoreScrollPosition = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, []);

  // Auto-scroll on new messages if at bottom
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll, scrollToBottom]);

  return {
    containerRef,
    endRef,
    shouldAutoScroll,
    setShouldAutoScroll,
    handleScroll,
    saveScrollPosition,
    restoreScrollPosition,
    scrollToBottom,
  };
};

// ============================================================
// Components
// ============================================================

// ---------- MessageContextMenu ----------
interface MenuPosition {
  top: number;
  left: number;
  placement: "top" | "bottom";
}

interface MessageContextMenuProps {
  anchorRef: React.RefObject<HTMLButtonElement>;
  isSender: boolean;
  isPinned: boolean;
  onClose: () => void;
  onReply: () => void;
  onPin: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReact: (emoji: string) => void;
}

const MessageContextMenu = ({
  anchorRef,
  isSender,
  isPinned,
  onClose,
  onReply,
  onPin,
  onEdit,
  onDelete,
  onReact
}: MessageContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const calculatePosition = () => {
      if (!anchorRef.current) return;
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = anchorRect.bottom + MENU_MARGIN;
      let placement: "top" | "bottom" = "bottom";

      if (top + MENU_HEIGHT > viewportHeight - MENU_MARGIN) {
        placement = "top";
        top = anchorRect.top - MENU_HEIGHT - MENU_MARGIN;
      }

      top = Math.max(MENU_MARGIN, Math.min(top, viewportHeight - MENU_HEIGHT - MENU_MARGIN));

      let left = isSender 
        ? anchorRect.left 
        : anchorRect.right - MENU_WIDTH;
      
      left = Math.max(MENU_MARGIN, Math.min(left, viewportWidth - MENU_WIDTH - MENU_MARGIN));

      setPosition({ top, left, placement });
    };

    calculatePosition();
    window.addEventListener("scroll", calculatePosition, true);
    window.addEventListener("resize", calculatePosition);
    
    return () => {
      window.removeEventListener("scroll", calculatePosition, true);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [anchorRef, isSender]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, onClose]);

  if (!position) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: MENU_WIDTH,
        zIndex: 9999,
        maxHeight: "calc(100vh - 20px)",
        overflow: "auto",
        transformOrigin: position.placement === "bottom" ? "top center" : "bottom center"
      }}
      className={`rounded-2xl border border-white/10 bg-[#12141f]/95 backdrop-blur-sm py-1.5 shadow-2xl shadow-black/60 transition-all duration-150 ease-out ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <button
        role="menuitem"
        onClick={onReply}
        className="mx-1.5 flex w-[calc(100%-12px)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/10"
      >
        <Reply className="h-4 w-4 text-blue-400" />
        Reply
      </button>
      <button
        role="menuitem"
        onClick={onPin}
        className="mx-1.5 flex w-[calc(100%-12px)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/10"
      >
        <Pin className="h-4 w-4 text-yellow-400" />
        {isPinned ? "Unpin" : "Pin"}
      </button>

      {isSender && onEdit && (
        <button
          role="menuitem"
          onClick={onEdit}
          className="mx-1.5 flex w-[calc(100%-12px)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-200 transition hover:bg-white/10"
        >
          <Pencil className="h-4 w-4 text-emerald-400" />
          Edit
        </button>
      )}

      {isSender && onDelete && (
        <button
          role="menuitem"
          onClick={onDelete}
          className="mx-1.5 flex w-[calc(100%-12px)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      )}

      <div className="mx-3 my-1.5 border-t border-white/10" />

      <div className="px-1">
        <EmojiPicker
          reactionsDefaultOpen
          allowExpandReactions
          reactions={QUICK_REACTIONS}
          onReactionClick={(emojiData) => {
            onReact(emojiData.emoji);
            onClose();
          }}
          onEmojiClick={(emojiData) => {
            onReact(emojiData.emoji);
            onClose();
          }}
          width="100%"
          height={360}
          theme="dark"
          emojiStyle={EmojiStyle.APPLE}
          searchPlaceholder="Search emojis..."
          previewConfig={{ showPreview: false }}
          skinTonePickerLocation="none"
        />
      </div>
    </div>,
    document.body
  );
};

// ---------- MessageActions ----------
interface MessageActionsProps {
  isSender: boolean;
  isPinned: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onReply: () => void;
  onPin: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReact: (emoji: string) => void;
}

const MessageActions = ({
  isSender,
  isPinned,
  isOpen,
  onToggle,
  onClose,
  onReply,
  onPin,
  onEdit,
  onDelete,
  onReact
}: MessageActionsProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative flex-shrink-0 self-center">
      <button
        ref={buttonRef}
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`rounded-full border border-white/5 p-1.5 text-zinc-400 transition-opacity hover:bg-white/10 hover:text-white ${
          isOpen ? "bg-white/10 text-white opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <MessageContextMenu
          anchorRef={buttonRef}
          isSender={isSender}
          isPinned={isPinned}
          onClose={onClose}
          onReply={onReply}
          onPin={onPin}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
        />
      )}
    </div>
  );
};

// ---------- MessageBubble ----------
interface MessageBubbleProps {
  message: Message;
  isSender: boolean;
  isPinned: boolean;
  repliedMessage?: Message | null;
  senderProfile?: Profile | null;
  userProfile?: Profile | null;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onReply: () => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}

const MessageBubble = ({
  message,
  isSender,
  isPinned,
  repliedMessage,
  senderProfile,
  userProfile,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
  onReply,
  onPin,
  onEdit,
  onDelete,
  onReact,
}: MessageBubbleProps) => {
  const isImage = message.message_type === 'image';
  const hasAttachment = message.attachments && message.attachments.length > 0;
  const hasReaction = message.message_react && message.message_react.length > 0;
  const isRead = message.read_by && message.read_by.length > 0;
  const isReply = message.message_id_reply && message.message_id_reply !== "";

  // Get avatar URL
  const getAvatar = useCallback(() => {
    const profile = isSender ? userProfile : senderProfile;
    const name = profile?.name || (isSender ? 'You' : 'Other');
    const avatarUrl = profile?.avatar_preset_url;
    
    if (avatarUrl) {
      const fullUrl = getAvatarUrl(avatarUrl);
      if (fullUrl) return fullUrl;
    }
    
    const bgColor = isSender ? '6366f1' : '8b5cf6';
    return `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=${bgColor}&color=fff&bold=true`;
  }, [isSender, userProfile, senderProfile]);

  return (
    <div className={`flex items-center gap-2 ${isSender ? 'flex-row-reverse' : ''} group relative w-full`}>
      {/* Avatar */}
      <div className="flex-shrink-0 self-start mt-1">
        <img
          src={getAvatar()}
          alt="avatar"
          className="h-8 w-8 rounded-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const name = isSender ? (userProfile?.name || 'You') : 'Other';
            const bgColor = isSender ? '6366f1' : '8b5cf6';
            target.src = `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=${bgColor}&color=fff&bold=true`;
          }}
        />
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isSender ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {/* Pin indicator */}
        {isPinned && (
          <div className="flex items-center gap-1 text-xs text-yellow-500 mb-1">
            <Pin className="h-3 w-3" />
            <span>Pinned</span>
          </div>
        )}
        
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isSender
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              : 'bg-white/10 text-white'
          }`}
        >
          {/* Reply indicator */}
          {isReply && repliedMessage && (
            <div className={`mb-1 text-xs ${isSender ? 'text-blue-200' : 'text-zinc-400'} border-l-2 border-blue-400 pl-2`}>
              <span className="font-medium">Replying to: </span>
              <span className="opacity-80">{repliedMessage.message_content.substring(0, 50)}...</span>
            </div>
          )}

          {/* Image Attachment */}
          {isImage && hasAttachment && (
            <div className="mb-2">
              <img
                src={message.attachments[0].attachment_url}
                alt="attachment"
                className="rounded-lg max-w-[300px] max-h-[200px] object-cover"
              />
            </div>
          )}

          {/* File Attachment */}
          {!isImage && hasAttachment && (
            <div className="mb-2 flex items-center gap-2 bg-white/10 rounded-lg p-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm truncate max-w-[150px]">
                {message.attachments[0].attachment_url.split('/').pop() || 'file'}
              </span>
            </div>
          )}

          {/* Message Text */}
          {message.message_content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.message_content}
            </p>
          )}

          {/* Reactions */}
          {hasReaction && (
            <div className="mt-1 flex gap-1 flex-wrap">
              {message.message_react.map((react, index) => (
                <span
                  key={index}
                  className="text-sm bg-white/20 rounded-full px-1.5 py-0.5"
                >
                  {react.react_type}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Message Metadata */}
        <div className={`flex items-center gap-2 mt-1 text-xs text-zinc-500 ${isSender ? 'flex-row-reverse' : ''}`}>
          <span>{formatMessageTime(message.created_at)}</span>
          {isSender && (
            <span className="flex items-center gap-0.5">
              {isRead ? (
                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5 text-zinc-500" />
              )}
            </span>
          )}
          {message.is_edited && (
            <span className="text-[10px]">(edited)</span>
          )}
        </div>
      </div>

      {/* Actions trigger */}
      <MessageActions
        isSender={isSender}
        isPinned={isPinned}
        isOpen={isMenuOpen}
        onToggle={onToggleMenu}
        onClose={onCloseMenu}
        onReply={onReply}
        onPin={onPin}
        onEdit={isSender ? onEdit : undefined}
        onDelete={isSender ? onDelete : undefined}
        onReact={onReact}
      />
    </div>
  );
};

// ---------- Inbox Main Component ----------
const Inbox = () => {
  const navigate = useNavigate();
  const { user } = useGlobalState();
  
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [activeTab, setActiveTab] = useState<"direct" | "engagement">("direct");
  const [inboxList, setInboxList] = useState<Inbox[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Inbox | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<{ [key: string]: Profile }>({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Scroll management
  const {
    containerRef,
    endRef,
    shouldAutoScroll,
    setShouldAutoScroll,
    handleScroll,
    saveScrollPosition,
    restoreScrollPosition,
    scrollToBottom,
  } = useScrollManagement(messages);

  // ============================================================
  // Effects
  // ============================================================
  
  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.account_id) return;
      try {
        const response = await api.get(`/api/accounts/profile/${user.account_id}`);
        setUserProfile(response.data.data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    fetchUserProfile();
  }, [user?.account_id]);

  // Fetch profile for a specific account ID
  const fetchProfile = useCallback(async (accountId: string) => {
    if (!accountId) return null;
    if (profiles[accountId]) return profiles[accountId];
    
    try {
      const response = await api.get(`/api/accounts/profile/${accountId}`);
      const profile = response.data.data;
      setProfiles(prev => ({ ...prev, [accountId]: profile }));
      return profile;
    } catch (error) {
      console.error(`Error fetching profile for ${accountId}:`, error);
      return null;
    }
  }, [profiles]);

  const checkMessageSender = useCallback((message: Message): boolean => {
    return message.sender_id === user?.account_id || message.sender_id === "user1";
  }, [user?.account_id]);

  // ============================================================
  // Message Handlers
  // ============================================================
  
  const handleSendMessage = useCallback(() => {
    const trimmed = messageInput.trim();
    if (!trimmed) return;
    
    if (editingMessage) {
      socket.emit("updateMessage", {
        conversation_id: selectedConversation?._id,
        message_id: editingMessage._id,
        action: 'set',
        payload: {
          message_content: trimmed,
          updated_at: new Date()
        }
      });
      setEditingMessage(null);
      setMessageInput("");
      return;
    }

    const messagePayload: Message = {
      _id: `${Date.now()}-${Math.random()}`,
      conversation_id: selectedConversation?._id || "",
      sender_id: user?.account_id || "",
      message_type: "text",
      message_content: trimmed,
      message_id_reply: replyToMessage?._id || "",
      attachments: [],
      links: [],
      message_react: [],
      read_by: [],
      is_edited: false,
      deleted_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    setMessageInput("");
    setReplyToMessage(null);
    socket.emit("sendMessage", messagePayload);
    setShouldAutoScroll(true);
  }, [messageInput, editingMessage, selectedConversation, user?.account_id, replyToMessage, setShouldAutoScroll]);

 // Handle reaction - local state update only (no socket emit for prototype)
const handleReact = useCallback((message: Message, emoji: string) => {
  const accountId = user?.account_id || "";
  
  // Get current reactions
  const reacts = Array.isArray(message.message_react) ? message.message_react : [];
  const existingIndex = reacts.findIndex(r => r.account_id === accountId);
  const existingReaction = existingIndex !== -1 ? reacts[existingIndex] : null;
  
  // Log the action for debugging
  let actionType = '';
  if (!existingReaction) {
    actionType = 'ADD';
  } else if (existingReaction.react_type === emoji) {
    actionType = 'REMOVE';
  } else {
    actionType = 'REPLACE';
  }
  
  console.log(`📝 Reaction action: ${actionType} - Emoji: ${emoji} - Message: ${message._id}`);
  
  // Update local state optimistically
  setMessages(prev => prev.map(msg => 
    msg._id === message._id ? updateMessageReactions(msg, accountId, emoji) : msg
  ));

  // Prevent scroll
  saveScrollPosition();
  setShouldAutoScroll(false);

  // NOTE: Socket emit is commented out for prototype testing
  // Will be uncommented when backend is ready
  /*
  const update = getReactionUpdate(message, accountId, emoji);
  let action: 'push' | 'set' | 'pull';
  switch (update.action) {
    case 'add': action = 'push'; break;
    case 'replace': action = 'set'; break;
    case 'remove': action = 'pull'; break;
  }

  socket.emit("updateMessage", {
    conversation_id: selectedConversation?._id,
    message_id: message._id,
    action,
    payload: {
      message_react: {
        account_id: accountId,
        react_type: emoji,
      },
    },
  });
  */


  setActiveMenuMessageId(null);
}, [user?.account_id]);

  const handleReply = useCallback((message: Message) => {
    setReplyToMessage(message);
    setActiveMenuMessageId(null);
    setTimeout(() => {
      const inputElement = document.querySelector('textarea');
      if (inputElement) inputElement.focus();
    }, 0);
  }, []);

// Handle pin - mock logic (no API/socket for prototype)
const handlePin = useCallback((message: Message) => {
  // Save current scroll position before any state updates
  saveScrollPosition();
  setShouldAutoScroll(false);
  
  // Get current pinned messages
  const currentPinned = selectedConversation?.pinned_messages || [];
  const isAlreadyPinned = currentPinned.some(pm => pm.message_id === message._id);
  
  let updatedPinnedMessages: PinnedMessage[];
  
  if (isAlreadyPinned) {
    // Unpin: Remove the message from pinned_messages
    updatedPinnedMessages = currentPinned.filter(pm => pm.message_id !== message._id);
    console.log(`📌 Unpinned message: ${message._id}`);
  } else {
    // Pin: Add the message to pinned_messages
    const newPinned: PinnedMessage = {
      message_id: message._id,
      pinned_by: user?.account_id || "unknown",
      pinned_at: new Date()
    };
    updatedPinnedMessages = [...currentPinned, newPinned];
    console.log(`📌 Pinned message: ${message._id}`);
  }
  
  // Update the selected conversation's pinned_messages
  setSelectedConversation(prev => {
    if (!prev) return prev;
    return {
      ...prev,
      pinned_messages: updatedPinnedMessages
    };
  });
  
  // Also update the inbox list to reflect the pin change
  setInboxList(prev => prev.map(inbox => {
    if (inbox._id === selectedConversation?._id) {
      return {
        ...inbox,
        pinned_messages: updatedPinnedMessages
      };
    }
    return inbox;
  }));
  
  // Close the menu
  setActiveMenuMessageId(null);
  
  // Restore scroll position after state updates
  setTimeout(() => {
    restoreScrollPosition();
    setShouldAutoScroll(true);
  }, 50);
  
  console.log(`📌 Updated pinned messages:`, updatedPinnedMessages.map(pm => pm.message_id));
}, [selectedConversation, user?.account_id, saveScrollPosition, restoreScrollPosition, setShouldAutoScroll]);

  const handleEdit = useCallback((message: Message) => {
    setActiveMenuMessageId(null);
    setMessageInput(message.message_content);
    setReplyToMessage(null);
    setEditingMessage(message);
    setTimeout(() => {
      const inputElement = document.querySelector('textarea');
      if (inputElement) inputElement.focus();
    }, 0);
  }, []);

  const handleDelete = useCallback(async (message: Message) => {
    try {
      await api.delete(`api/inbox/message/${message._id}`);
      setMessages(prev => prev.filter(m => m._id !== message._id));
      setActiveMenuMessageId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }, []);

  const cancelReply = useCallback(() => {
    setReplyToMessage(null);
    setEditingMessage(null);
  }, []);

  // ============================================================
  // Socket Effects
  // ============================================================
  
  useEffect(() => {
    socket.connect();
    
    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });
    
    socket.on("newMessage", (message: any) => {
      if (!message || !message._id) return;
      
      setMessages(prev => {
        const exists = prev.some(m => m._id === message._id);
        if (exists) return prev;
        
        const optimisticIndex = prev.findIndex(m => m._id === message._id);
        if (optimisticIndex !== -1) {
          const newMessages = [...prev];
          newMessages[optimisticIndex] = message;
          return newMessages;
        }
        
        return [...prev, message];
      });
      
      setShouldAutoScroll(true);
    });
    
    socket.on("messageUpdated", (updatedMessage: Message) => {
      // Save current scroll position before update
      saveScrollPosition();
      
      setMessages(prev =>
        prev.map(msg =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        )
      );
      
      // Restore scroll position after update
      setTimeout(() => {
        restoreScrollPosition();
      }, 0);
    });
    
    socket.on("disconnect", () => {
      console.log("Disconnected");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("newMessage");
      socket.off("messageUpdated");
      socket.disconnect();
    };
  }, [saveScrollPosition, restoreScrollPosition, setShouldAutoScroll]);

  // ============================================================
  // Data Fetching
  // ============================================================
  
  // Fetch inbox data - only when tab changes or on initial load
  useEffect(() => {
    const fetchInbox = async () => {
      setLoading(true);
      try {
        const response = await api.get(`api/inbox/${activeTab}`);
        
        // Fetch profiles for all members
        const memberIds = response.data.flatMap((inbox: Inbox) => 
          inbox.members.map(member => member.account_id)
        );
        const uniqueIds = [...new Set(memberIds)];
        const profilePromises = uniqueIds.map(id => 
          api.get(`/api/accounts/profile/${id}`).catch(() => null)
        );
        const profileResponses = await Promise.all(profilePromises);
        
        const profileMap: { [key: string]: Profile } = {};
        profileResponses.forEach((res, index) => {
          if (res?.data?.data) {
            profileMap[uniqueIds[index]] = res.data.data;
          }
        });
        setProfiles(profileMap);
        
        // Enrich inbox with conversation names
        const inboxWithNames = response.data.map((inbox: Inbox) => {
          const recipient = inbox.members.find(
            member => member.account_id !== user?.account_id
          );
          
          let conversationName = inbox.conversation_name;
          if (recipient && profileMap[recipient.account_id]) {
            conversationName = profileMap[recipient.account_id].name || `User ${recipient.account_id}`;
          } else if (recipient) {
            conversationName = `User ${recipient.account_id}`;
          }
          
          return {
            ...inbox,
            conversation_name: conversationName,
          };
        });

        setInboxList(activeTab === 'direct' ? inboxWithNames : response.data);
        
        // Auto-select first conversation only on initial load or when switching tabs
        if (inboxWithNames.length > 0) {
          // Check if currently selected conversation still exists
          const currentStillExists = selectedConversation && inboxWithNames.some(
            (inbox: Inbox) => inbox._id === selectedConversation._id
          );
          
          if (!currentStillExists || isInitialLoad) {
            setSelectedConversation(inboxWithNames[0]);
            setIsInitialLoad(false);
          }
          // Otherwise keep the current selection
        } else {
          setSelectedConversation(null);
        }
      } catch (error) {
        console.error('Error fetching inbox:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // Only depend on activeTab, not selectedConversation

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!selectedConversation) return;
    
    socket.emit("joinRoom", selectedConversation._id);
    
    const fetchMessages = async () => {
      try {
        setMessageLoading(true);
        const response = await api.get(`api/inbox/conversation/${selectedConversation._id}`);
        setMessages(response.data.Messages || []);
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setMessages([]);
      } finally {
        setMessageLoading(false);
      }
    };
    fetchMessages();
  }, [selectedConversation, scrollToBottom]);

  // ============================================================
  // UI Helpers
  // ============================================================
  
  const getConversationName = useCallback((inbox: Inbox): string => {
    if (inbox.conversation_name) return inbox.conversation_name;

    if (inbox.conversation_type === "direct") {
      const otherMember = inbox.members.find(
        (m) => m.account_id !== user?.account_id
      );
      if (otherMember && profiles[otherMember.account_id]) {
        return profiles[otherMember.account_id].name;
      }
      return otherMember
        ? `User ${otherMember.account_id}`
        : userProfile?.name || "Unknown User";
    }

    return "Group Chat";
  }, [user?.account_id, profiles, userProfile]);

  const getAvatar = useCallback((inbox: Inbox): string => {
    if (inbox.conversation_type === "direct") {
      const otherMember = inbox.members.find(
        (m) => m.account_id !== user?.account_id
      );

      if (otherMember && profiles[otherMember.account_id]) {
        const profile = profiles[otherMember.account_id];
        if (profile.avatar_preset_url) {
          const fullUrl = getAvatarUrl(profile.avatar_preset_url);
          return fullUrl || `https://ui-avatars.com/api/?name=${profile.name.substring(0, 2)}&background=6366f1&color=fff&bold=true`;
        }
        const name = profile.name || `User ${otherMember.account_id}`;
        return `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=6366f1&color=fff&bold=true`;
      }

      if (!otherMember && userProfile) {
        if (userProfile.avatar_preset_url) {
          const fullUrl = getAvatarUrl(userProfile.avatar_preset_url);
          return fullUrl || `https://ui-avatars.com/api/?name=${userProfile.name.substring(0, 2)}&background=6366f1&color=fff&bold=true`;
        }
        const name = userProfile.name || "You";
        return `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=6366f1&color=fff&bold=true`;
      }

      if (otherMember) {
        return `https://ui-avatars.com/api/?name=${otherMember.account_id.substring(0, 2)}&background=6366f1&color=fff&bold=true`;
      }
    }

    const name = getConversationName(inbox);
    return `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=10b981&color=fff&bold=true`;
  }, [user?.account_id, profiles, userProfile, getConversationName]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach(message => {
      const dateKey = new Date(message.created_at).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(message);
    });
    return groups;
  }, [messages]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return inboxList.filter((inbox) =>
      getConversationName(inbox).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inboxList, searchQuery, getConversationName]);

  // ============================================================
  // Render Message
  // ============================================================
  const renderMessage = useCallback((message: Message) => {
    const isSender = checkMessageSender(message);
    const isPinned = selectedConversation?.pinned_messages?.some(
      pm => pm.message_id === message._id
    ) || false;
    const isReply = message.message_id_reply && message.message_id_reply !== "";
    const repliedMessage = isReply ? messages.find(m => m._id === message.message_id_reply) : null;
    const senderId = typeof message.sender_id === 'string' ? message.sender_id : String(message.sender_id);
    const senderProfile = isSender ? userProfile : profiles[senderId];

    return (
      <MessageBubble
        key={message._id}
        message={message}
        isSender={isSender}
        isPinned={isPinned}
        repliedMessage={repliedMessage}
        senderProfile={senderProfile}
        userProfile={userProfile}
        isMenuOpen={activeMenuMessageId === message._id}
        onToggleMenu={() => setActiveMenuMessageId(
          activeMenuMessageId === message._id ? null : message._id
        )}
        onCloseMenu={() => setActiveMenuMessageId(null)}
        onReply={() => handleReply(message)}
        onPin={() => handlePin(message)}
        onEdit={() => handleEdit(message)}
        onDelete={() => handleDelete(message)}
        onReact={(emoji) => handleReact(message, emoji)}
      />
    );
  }, [
    checkMessageSender,
    selectedConversation,
    messages,
    userProfile,
    profiles,
    activeMenuMessageId,
    handleReply,
    handlePin,
    handleEdit,
    handleDelete,
    handleReact,
  ]);

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="min-h-screen bg-[#080a12] overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0d0f1a]/95 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-blue-400" />
            Messages
          </h1>
          <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
            <UserPlus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl h-[calc(100vh-73px)] overflow-hidden">
        <div className="flex h-full overflow-hidden">
          {/* Chat List Sidebar */}
          <div className="hidden md:flex w-80 flex-col border-r border-white/10 bg-[#0d0f1a] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/10 flex-shrink-0">
              <button
                onClick={() => setActiveTab("direct")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
                  activeTab === "direct"
                    ? "text-white border-b-2 border-blue-500"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Users className="h-4 w-4" />
                Direct Messages
              </button>
              <button
                onClick={() => setActiveTab("engagement")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
                  activeTab === "engagement"
                    ? "text-white border-b-2 border-blue-500"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Engagements
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder={activeTab === "direct" ? "Search conversations..." : "Search engagements..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <MessageCircle className="h-12 w-12 text-zinc-600 mb-3" />
                  <p className="text-zinc-400">
                    {searchQuery ? 'No conversations found' : 'No messages yet'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((inbox) => {
                  const isActive = selectedConversation?._id === inbox._id;
                  const name = getConversationName(inbox);
                  const avatar = getAvatar(inbox);
                  const lastMessage = inbox.last_message || 'No messages yet';
                  const time = formatTime(inbox.last_message_time || inbox.updated_at);
                  const unreadCount = inbox.unread_count || 0;

                  return (
                    <button
                      key={inbox._id}
                      onClick={() => setSelectedConversation(inbox)}
                      className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all duration-200 ${
                        isActive ? 'bg-gradient-to-r from-blue-500/20 to-transparent border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={avatar}
                          alt={name}
                          className="h-12 w-12 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=6366f1&color=fff&bold=true`;
                          }}
                        />
                        {inbox.conversation_type === 'direct' && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-[#0d0f1a]"></span>
                        )}
                      </div>
                      
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-white truncate">{name}</p>
                        <p className="text-xs text-zinc-500 truncate">{lastMessage}</p>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-zinc-500">{time}</p>
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-500 text-[10px] font-medium text-white px-1">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gradient-to-b from-[#0d0f1a] to-[#080a12] overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="sticky top-0 z-10 bg-[#0d0f1a]/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <img
                      src={getAvatar(selectedConversation)}
                      alt={getConversationName(selectedConversation)}
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const name = getConversationName(selectedConversation);
                        target.src = `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=6366f1&color=fff&bold=true`;
                      }}
                    />
                    <div>
                      <h2 className="font-semibold text-white">
                        {getConversationName(selectedConversation)}
                      </h2>
                      <p className="text-xs text-zinc-500">
                        {selectedConversation.conversation_type === 'direct' 
                          ? 'Active now' 
                          : `${selectedConversation.members.length} members`}
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
                    <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Messages Area */}
                <div 
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                  ref={containerRef}
                  onScroll={handleScroll}
                >
                  {messageLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
                        <div key={dateKey}>
                          <div className="flex justify-center my-4">
                            <span className="text-xs text-zinc-500 bg-[#0d0f1a] px-3 py-1 rounded-full border border-white/10">
                              {getDateLabel(dateKey)}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {dateMessages.map(renderMessage)}
                          </div>
                        </div>
                      ))}
                      <div ref={endRef} />
                    </>
                  )}
                </div>

                {/* Reply/Edit indicator */}
                {(replyToMessage || editingMessage) && (
                  <div className="px-4 py-2 bg-[#0d0f1a] border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      {replyToMessage ? (
                        <>
                          <Reply className="h-4 w-4 text-blue-400" />
                          <span>Replying to: <span className="text-white">{replyToMessage.message_content.substring(0, 50)}...</span></span>
                        </>
                      ) : editingMessage ? (
                        <>
                          <Pencil className="h-4 w-4 text-emerald-400" />
                          <span>Editing message</span>
                        </>
                      ) : null}
                    </div>
                    <button
                      onClick={cancelReply}
                      className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Message Input */}
                <div className="border-t border-white/10 bg-[#0d0f1a] p-4 flex-shrink-0">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        placeholder={replyToMessage ? "Write a reply..." : editingMessage ? "Edit message..." : "Type a message..."}
                        rows={1}
                        className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 pr-12 text-sm text-white outline-none resize-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <button className="absolute right-2 bottom-1.5 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                        <Image className="h-4 w-4" />
                      </button>
                    </div>
                    <button className="rounded-xl p-2.5 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-2.5 text-white transition hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!messageInput.trim()}
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                    <MessageCircle className="h-12 w-12 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {activeTab === 'direct' ? 'Direct Messages' : 'Engagements'}
                  </h3>
                  <p className="text-zinc-400 max-w-sm">
                    {inboxList.length === 0 
                      ? 'No conversations found. Start a new chat!' 
                      : 'Select a conversation from the sidebar to start messaging'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;