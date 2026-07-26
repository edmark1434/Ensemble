import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  Video,
  Minus,
  Smile,
  Send,
} from "lucide-react";
import type { ChatTarget } from "@/components/ui/Layout";
import {
  MOCK_CONVERSATIONS,
  type Message,
} from "./chat_bubble_datasets";

interface ChatWindowProps {
  onClose: () => void;
  activeUser: ChatTarget | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onClose, activeUser }) => {
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const displayName = activeUser?.name || "Support Chat";

  useEffect(() => {
    setMessages(MOCK_CONVERSATIONS[displayName] || []);
  }, [displayName]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      text: messageText,
      sender: "me",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-[330px] sm:w-[360px] h-[480px] bg-[#0c0f1d] text-zinc-100 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
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

          {/* User Name & Status */}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-[13.5px] leading-tight truncate text-white tracking-tight">
              {displayName}
            </h3>
            <span className="text-[10px] text-zinc-400 block -mt-0.5">Active now</span>
          </div>
        </div>

        {/* Action Controls - Only Phone and Video kept */}
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

      {/* Message Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#080a12]/80 text-[13px] scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.length === 0 ? (
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
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "me" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-3.5 py-2 rounded-[18px] leading-relaxed shadow-sm break-words text-[12.5px] ${
                  msg.sender === "me"
                    ? "bg-blue-600 text-white rounded-br-[4px]"
                    : "bg-[#1f2230] text-zinc-200 border border-white/5 rounded-bl-[4px]"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[9px] text-zinc-500 mt-0.5 px-1 font-mono">{msg.time}</span>
            </div>
          ))
        )}
      </div>

      {/* Simplified Input Bar */}
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