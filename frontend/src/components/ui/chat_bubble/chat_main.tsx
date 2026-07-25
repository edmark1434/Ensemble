// src/components/ui/chat_bubble/chat_main.tsx
import React, { useState } from "react";
import { SquarePen, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatWindow } from "./chat_bubble_components/ChatWindow";
import type { ChatTarget } from "@/components/ui/Layout";

interface ChatMainProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: ChatTarget | null;
  recentChats: ChatTarget[];
  onSelectChat: (target: ChatTarget) => void;
}

export const ChatMain: React.FC<ChatMainProps> = ({
  isOpen,
  onClose,
  activeUser,
  recentChats,
  onSelectChat,
}) => {
  // Collapsed by default
  const [isStackExpanded, setIsStackExpanded] = useState(false);

  // Filter out the active chat user so their bubble disappears while window is open
  const visibleBubbles =
    isOpen && activeUser
      ? recentChats.filter((chat) => chat.name !== activeUser.name)
      : recentChats;

  const handlePencilClick = () => {
    setIsStackExpanded((prev) => !prev);
  };

  return (
    <div className="fixed bottom-5 right-6 z-50 flex items-end gap-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Active Chat Window on the LEFT */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <ChatWindow onClose={onClose} activeUser={activeUser} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble Trigger Stack on the RIGHT */}
      <div className="flex flex-col items-end gap-2.5">
        <AnimatePresence>
          {isStackExpanded &&
            visibleBubbles.map((chat, index) => {
              const initials = chat.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <motion.button
                  key={chat.id || chat.name}
                  initial={{ opacity: 0, y: 15, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.8 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.05,
                  }}
                  onClick={() => onSelectChat(chat)}
                  className="relative group transition-transform active:scale-95 focus:outline-none"
                  title={chat.name}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-[2px] shadow-xl hover:shadow-2xl">
                    <div className="w-full h-full rounded-full bg-[#080a12] flex items-center justify-center font-bold text-white text-xs overflow-hidden border border-white/10">
                      {chat.avatarUrl ? (
                        <img
                          src={chat.avatarUrl}
                          alt={chat.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                  </div>
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#080a12]" />

                  {/* Name Tooltip on Hover */}
                  <div className="absolute right-14 top-1/2 -translate-y-1/2 hidden group-hover:block pointer-events-none">
                    <div className="bg-[#080a12] text-zinc-200 border border-white/15 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl backdrop-blur-md">
                      {chat.name}
                    </div>
                  </div>
                </motion.button>
              );
            })}
        </AnimatePresence>

        {/* Primary Toggle Pencil Button */}
        <button
          onClick={handlePencilClick}
          className="w-12 h-12 rounded-full bg-[#2a2d37] hover:bg-[#343846] text-zinc-200 flex items-center justify-center shadow-2xl border border-white/10 transition-all duration-200 active:scale-90 focus:outline-none"
          aria-label="Toggle chat stack"
        >
          {isStackExpanded ? <X size={20} /> : <SquarePen size={20} />}
        </button>
      </div>
    </div>
  );
};