// src/components/ui/chat_bubble/chat_bubble_components/ChatWindow.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Phone,
  Video,
  Minus,
  Smile,
  Send,
  CheckCheck,
} from "lucide-react";
import type { ChatTarget } from "@/components/ui/Layout";
import useGlobalState from '@/lib/global_state';
import socket from '@/lib/socket';

interface ChatWindowProps {
  onClose: () => void;
  activeUser: ChatTarget | null;
  messages?: any[];
  isLoading?: boolean;
  onNewMessage?: (message: any) => void;
  avatarPayload?: Record<string, string>; // account_id -> avatar path
}

interface Message {
  id: number | string;
  text: string;
  sender: "me" | "them";
  time: string;
  isRead?: boolean;
  isEdited?: boolean;
  createdAt?: Date;
  senderName?: string;
  senderAvatar?: string;
  senderId?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  onClose, 
  activeUser, 
  messages = [],
  isLoading = false,
  avatarPayload = {},
  onNewMessage,
}) => {
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useGlobalState();
  
  console.log("avatarPayload in ChatWindow:", avatarPayload);

  const displayName = activeUser?.name || "Support Chat";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Get CloudFront URL for avatar
  const getAvatarUrl = (avatarPath?: string): string | null => {
    if (!avatarPath) return null;
    // If it already starts with http, return as is
    if (avatarPath.startsWith("http")) return avatarPath;
    // If it starts with /, just append to CloudFront URL
    if (avatarPath.startsWith("/")) {
      return `${import.meta.env.VITE_CLOUDFRONT_URL}${avatarPath}`;
    }
    // Otherwise add / prefix
    return `${import.meta.env.VITE_CLOUDFRONT_URL}/${avatarPath}`;
  };

  // Check if message is from current user
  const isCurrentUser = (senderId: string | number): boolean => {
    return senderId === user?.account_id || senderId === "user1";
  };

  // Format time
  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  // Format date for grouping
  const formatDateLabel = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = date.toDateString();

    if (dateStr === today.toDateString()) return 'Today';
    if (dateStr === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get sender name
  const getSenderName = (senderId: string): string => {
    if (!senderId) return "Unknown";
    if (isCurrentUser(senderId)) return "You";
    
    // If it's the active user, use their name
    if (activeUser && senderId === activeUser.account_id) {
      return activeUser.name || "Other";
    }
    
    return "Other";
  };

  // Get sender avatar from avatarPayload
  const getSenderAvatar = (senderId: string): string => {
    if (!senderId) {
      return `https://ui-avatars.com/api/?name=Unknown&background=6b7280&color=fff&bold=true`;
    }
    
    if (isCurrentUser(senderId)) {
      return `https://ui-avatars.com/api/?name=You&background=6366f1&color=fff&bold=true`;
    }
    
    // Check avatarPayload for the sender - using avatarPayload[account_id]
    console.log(`🔍 Looking for avatar for senderId: "${senderId}"`);
    console.log(`📦 avatarPayload keys:`, Object.keys(avatarPayload));
    
    if (avatarPayload[senderId]) {
      const avatarPath = avatarPayload[senderId];
      const fullUrl = getAvatarUrl(avatarPath);
      console.log(`✅ Found avatar for ${senderId}:`, fullUrl);
      if (fullUrl) return fullUrl;
    }
    
    // If it's the active user, use their avatar or generate
    if (activeUser && senderId === activeUser.account_id) {
      if (activeUser.avatarUrl) return activeUser.avatarUrl;
      const name = activeUser.name || "Other";
      return `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=8b5cf6&color=fff&bold=true`;
    }
    
    // Fallback - use sender ID for initials
    console.log(`⚠️ No avatar found for ${senderId}, using fallback`);
    return `https://ui-avatars.com/api/?name=${senderId.substring(0, 2)}&background=8b5cf6&color=fff&bold=true`;
  };

  // Convert API messages to UI message format
  const convertApiMessages = (apiMessages: any[]): Message[] => {
    console.log('🔄 Converting API messages:', apiMessages);
    
    return apiMessages.map((msg) => {
      // Get sender_id - could be in different formats
      let senderId = '';
      if (msg.sender_id !== undefined && msg.sender_id !== null) {
        senderId = typeof msg.sender_id === 'string' ? msg.sender_id : String(msg.sender_id);
      } else if (msg.senderId) {
        senderId = typeof msg.senderId === 'string' ? msg.senderId : String(msg.senderId);
      } else if (msg.user_id) {
        senderId = typeof msg.user_id === 'string' ? msg.user_id : String(msg.user_id);
      }
      
      const isMe = isCurrentUser(senderId);
      
      return {
        id: msg._id || Date.now(),
        text: msg.message_content || msg.message || "",
        sender: isMe ? "me" : "them",
        time: formatTime(msg.created_at || new Date()),
        isRead: msg.read_by && msg.read_by.length > 0,
        isEdited: msg.is_edited || false,
        createdAt: msg.created_at || new Date(),
        senderName: getSenderName(senderId),
        senderAvatar: getSenderAvatar(senderId),
        senderId: senderId,
      };
    });
  };

  // Convert messages to UI format
  const displayMessages: Message[] = messages.length > 0 
    ? convertApiMessages(messages)
    : [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending message via WebSocket
  const handleSendMessage = () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    console.log("Sending message:", trimmed);
    console.log("Active user:", activeUser);

    const messagePayload = {
      _id: `${Date.now()}-${Math.random()}`,
      conversation_id: activeUser?.inbox_id || "",
      sender_id: user?.account_id || "",
      message_type: "text",
      message_content: trimmed,
      message_id_reply: "",
      attachments: [],
      links: [],
      message_react: [],
      read_by: [],
      is_edited: false,
      deleted_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    socket.emit("sendMessage", messagePayload);
    setMessageText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Group messages by date
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    msgs.forEach(message => {
      const date = message.createdAt 
        ? new Date(message.createdAt)
        : new Date();
      const dateKey = date.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    return groups;
  };

  const groupedMessages = groupMessagesByDate(displayMessages);

  // Get avatar for current user (for display in header)
  const getCurrentUserAvatar = (): string => {
    // Check if current user has avatar in payload
    if (user?.account_id && avatarPayload[user.account_id]) {
      const fullUrl = getAvatarUrl(avatarPayload[user.account_id]);
      if (fullUrl) return fullUrl;
    }
    if (user?.avatar) return user.avatar;
    return `https://ui-avatars.com/api/?name=You&background=6366f1&color=fff&bold=true`;
  };

  return (
    <div className="w-[330px] sm:w-[360px] h-[480px] bg-[#0c0f1d] text-zinc-100 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header - Exactly as original */}
      <div className="p-3 px-4 bg-[#080a12] border-b border-white/10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <div className="relative flex-shrink-0">
            {activeUser?.avatarUrl ? (
              <img
                src={activeUser.avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover border border-blue-500/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                {userInitials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#080a12]" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-[13.5px] leading-tight truncate text-white tracking-tight">
              {displayName}
            </h3>
            <span className="text-[10px] text-zinc-400 block -mt-0.5">Active now</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-blue-400 flex-shrink-0">
          <button className="p-1.5 hover:bg-white/5 rounded-full transition-colors" title="Start voice call">
            <Phone size={15} />
          </button>
          <button className="p-1.5 hover:bg-white/5 rounded-full transition-colors" title="Start video call">
            <Video size={15} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white"
            title="Minimize to bubble"
          >
            <Minus size={15} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white"
            title="Close chat"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Message Feed - Exactly as original */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#080a12]/80 text-[13px] scrollbar-thin scrollbar-thumb-zinc-800">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-3 text-blue-400">
              {userInitials}
            </div>
            <p className="text-sm font-semibold text-zinc-200 truncate max-w-[200px]">
              {displayName}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Start a direct workspace chat.
            </p>
          </div>
        ) : (
          <>
            {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
              <div key={dateKey}>
                {/* Date Divider */}
                <div className="flex justify-center my-3">
                  <span className="text-[10px] text-zinc-500 bg-[#0c0f1d] px-3 py-1 rounded-full border border-white/5">
                    {formatDateLabel(new Date(dateKey))}
                  </span>
                </div>

                {/* Messages */}
                {dateMessages.map((msg) => {
                  const isMe = msg.sender === "me";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      {/* Sender Name - Show for messages from others */}
                      {!isMe && (
                        <span className="text-[10px] text-zinc-400 mb-0.5 ml-1 font-medium">
                          {msg.senderName || "Other"}
                        </span>
                      )}
                      <div className="flex items-end gap-2">
                        {/* Avatar - Show for messages from others */}
                        {!isMe && (
                          <img
                            src={msg.senderAvatar || `https://ui-avatars.com/api/?name=OT&background=8b5cf6&color=fff&bold=true`}
                            alt={msg.senderName || "Other"}
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-white/10"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const name = msg.senderName || 'OT';
                              target.src = `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=8b5cf6&color=fff&bold=true`;
                            }}
                          />
                        )}
                        <div
                          className={`max-w-[80%] px-3.5 py-2 rounded-[18px] leading-relaxed shadow-sm break-words text-[12.5px] ${
                            isMe
                              ? "bg-blue-600 text-white rounded-br-[4px]"
                              : "bg-[#1f2230] text-zinc-200 border border-white/5 rounded-bl-[4px]"
                          }`}
                        >
                          {msg.text}
                        </div>
                        {/* Avatar for my messages on the right */}
                        {isMe && (
                          <img
                            src={getCurrentUserAvatar()}
                            alt="You"
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-white/10"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://ui-avatars.com/api/?name=You&background=6366f1&color=fff&bold=true`;
                            }}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] text-zinc-500 px-1 font-mono">
                          {msg.time}
                        </span>
                        {isMe && msg.isRead && (
                          <CheckCheck className="h-3 w-3 text-blue-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar - Exactly as original */}
      <div className="p-2.5 bg-[#080a12] border-t border-white/10 flex items-center gap-2">
        <div className="flex-1 bg-white/[0.05] border border-white/10 rounded-full px-3.5 py-1.5 flex items-center gap-2 focus-within:border-blue-500/50 transition">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Aa"
            className="w-full bg-transparent text-zinc-100 text-xs focus:outline-none placeholder-zinc-500"
          />
          <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <Smile size={16} />
          </button>
        </div>

        <button
          onClick={handleSendMessage}
          disabled={!messageText.trim()}
          className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-full transition-all flex-shrink-0"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};