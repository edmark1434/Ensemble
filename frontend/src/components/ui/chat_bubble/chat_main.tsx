import React, { useEffect, useMemo, useState } from "react";
import { SquarePen, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatWindow } from "./chat_bubble_components/ChatWindow";
import useChatState, { type ChatTarget } from "./chat_state";

interface ChatMainProps {
  activeUser: ChatTarget | null;
  recentChats: ChatTarget[];
  onSelectChat: (target: ChatTarget) => void;
  onRemoveChat?: (chatId: string) => void;
}

export const ChatMain: React.FC<ChatMainProps> = ({
  activeUser,
  recentChats,
  onSelectChat,
  onRemoveChat,
}) => {
  const [isStackExpanded, setIsStackExpanded] = useState(false);
  const [minimizedIds, setMinimizedIds] = useState<Set<string>>(new Set());
  const messagesByConversation = useChatState(
    (state) => state.messagesByConversation
  );
  const loadingMessages = useChatState((state) => state.loadingMessages);

  useEffect(() => {
    if (!activeUser) return;
    const timer = window.setTimeout(() => {
      setMinimizedIds((current) => {
        if (!current.has(String(activeUser.id))) return current;
        const next = new Set(current);
        next.delete(String(activeUser.id));
        return next;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeUser]);

  const openWindows = useMemo(
    () =>
      recentChats.filter((chat) => !minimizedIds.has(String(chat.id))),
    [minimizedIds, recentChats]
  );
  const minimizedWindows = useMemo(
    () =>
      recentChats.filter((chat) => minimizedIds.has(String(chat.id))),
    [minimizedIds, recentChats]
  );

  const minimizeWindow = (chatId: string) => {
    setMinimizedIds((current) => new Set(current).add(String(chatId)));
  };

  const restoreWindow = (chat: ChatTarget) => {
    setMinimizedIds((current) => {
      const next = new Set(current);
      next.delete(String(chat.id));
      return next;
    });
    onSelectChat(chat);
  };

  const closeWindow = (chatId: string) => {
    setMinimizedIds((current) => {
      const next = new Set(current);
      next.delete(String(chatId));
      return next;
    });
    onRemoveChat?.(chatId);
  };

  return (
    <div className="fixed bottom-5 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-end gap-4 overflow-x-auto font-['Plus_Jakarta_Sans',sans-serif]">
      <AnimatePresence>
        {openWindows.map((chat) => {
          const conversationId = String(chat.inbox_id || chat.id);
          return (
            <motion.div
              key={conversationId}
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex-shrink-0"
            >
              <ChatWindow
                onMinimize={() => minimizeWindow(conversationId)}
                onClose={() => closeWindow(conversationId)}
                activeUser={chat}
                messages={messagesByConversation[conversationId] || []}
                isLoading={Boolean(loadingMessages[conversationId])}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div className="flex flex-shrink-0 flex-col items-end gap-2.5">
        <AnimatePresence>
          {isStackExpanded &&
            minimizedWindows.map((chat, index) => {
              const initials = chat.name
                .split(" ")
                .map((name) => name[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <motion.div
                  key={chat.id || chat.name}
                  initial={{ opacity: 0, y: 15, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.8 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="relative group"
                >
                  <button
                    onClick={() => restoreWindow(chat)}
                    className="relative transition-transform active:scale-95 focus:outline-none"
                    title={`Restore ${chat.name}`}
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
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#080a12]" />
                    {!!chat.unreadCount && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center border-2 border-[#080a12] font-medium">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      closeWindow(chat.id);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 border-2 border-[#080a12] shadow-lg z-10"
                    title="Close chat"
                  >
                    <X size={10} />
                  </button>
                </motion.div>
              );
            })}
        </AnimatePresence>

        <button
          onClick={() => setIsStackExpanded((current) => !current)}
          className="w-12 h-12 rounded-full bg-[#2a2d37] hover:bg-[#343846] text-zinc-200 flex items-center justify-center shadow-2xl border border-white/10 transition-all duration-200 active:scale-90 focus:outline-none"
          aria-label="Toggle minimized chats"
        >
          {isStackExpanded ? <X size={20} /> : <SquarePen size={20} />}
        </button>
      </div>
    </div>
  );
};
