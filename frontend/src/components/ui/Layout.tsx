// src/components/ui/Layout.tsx
import { Outlet } from "react-router-dom";
import UserNav from "@/components/nav/user_nav.tsx";
import { useState, useEffect, useCallback } from "react";
import { ChatMain } from "./chat_bubble/chat_main";
import UtilScrollTop from "@/components/utility/util_scroll_top.tsx";
import useGlobalState from '@/lib/global_state.ts';
import api from '@/lib/axios';
import socket from '@/lib/socket';
import {
  MOCK_CONVERSATIONS,
} from "./chat_bubble/chat_bubble_components/chat_bubble_datasets";

export interface ChatTarget {
  id: string;
  name: string;
  avatarUrl?: string;
  account_id?: string;
  inbox_id?: string;
  unreadCount?: number;
  avatarPayload?: {
    [accountId: string]: string; // Mapping of account IDs to avatar URLs
  }

}

declare global {
  interface Window {
    "chat-get-from"?: (name: string, message?: string, avatarUrl?: string) => void;
    chat?: any;
  }
}

export const emitIncomingMessage = (sender: ChatTarget) => {
  window.dispatchEvent(
    new CustomEvent("chat:incoming-message", { detail: sender })
  );
};

const Layout = () => {
  const [marginLeft, setMarginLeft] = useState("16rem");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState<ChatTarget | null>(null);
  const [recentChats, setRecentChats] = useState<ChatTarget[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [avatarPayload, setAvatarPayload] = useState<{ [accountId: string]: string }>({});
  const { user } = useGlobalState();
  
  // State for messages
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Handle new messages from socket
  const handleNewMessage = useCallback((message: any) => {
    console.log('New message received in Layout:', message);
    
    // Only update if it's for the current conversation
    if (message.conversation_id === conversationId) {
      setChatMessages(prev => {
        // Check if message already exists (prevent duplicates)
        const exists = prev.some((m: any) => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });
    }
  }, [conversationId]);


  const handleRemoveChat = useCallback((chatId: string) => {
  setRecentChats((prev) => prev.filter((chat) => chat.id !== chatId));
  
  // If the removed chat was the active one, close the chat
  if (activeChatUser?.id === chatId) {
    setActiveChatUser(null);
    setIsChatOpen(false);
  }
  }, [activeChatUser]);
  
  // Listen for socket messages
  useEffect(() => {
    socket.on("newMessage", handleNewMessage);
    socket.emit("joinRoom", conversationId);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [handleNewMessage]);

  // Fetch conversation when accountId changes
  useEffect(() => {
    if (!accountId) return;
    
    const fetchConversations = async () => {
      setLoadingMessages(true);
      try { 
        // First get the conversation ID
        const fetchConversationId = await api.get(`/api/inbox/conversation/direct/${accountId}`);
        const inboxId = fetchConversationId.data.inbox._id;
        setConversationId(inboxId);
        setActiveChatUser((prev) => {
          if (prev) {
            return { ...prev, inbox_id: inboxId };
          }
          return prev;
        });
        setRecentChats((prev) => {
          const updatedChats = prev.map((chat) => {
            if (chat.account_id === accountId) {
              return { ...chat, inbox_id: inboxId };
            }
            return chat;
          });
          return updatedChats;
        });
        setAvatarPayload(fetchConversationId.data.inbox.avatarPayload);
        // Then fetch the messages
        const fetchConversation = await api.get(`api/inbox/conversation/${inboxId}`);
        
        console.log("Fetched conversation ID:", fetchConversationId.data);
        console.log("Fetched conversation messages:", fetchConversation.data);
        
        // Set the messages from the response
        setChatMessages(fetchConversation.data.Messages || []);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        setChatMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };
    
    fetchConversations();
  }, [accountId]);

  useEffect(() => {
    const checkSidebarState = () => {
      const sidebar = document.querySelector("aside");
      if (sidebar) {
        const isCollapsed = sidebar.classList.contains("w-20");
        setMarginLeft(isCollapsed ? "5rem" : "16rem");
      }
    };

    const observer = new MutationObserver(checkSidebarState);
    const sidebar = document.querySelector("aside");

    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ["class"] });
    }

    checkSidebarState();

    return () => observer.disconnect();
  }, []);

  const handleIncomingMessage = useCallback((newSender: ChatTarget) => {
    setRecentChats((prev) => {
      const filtered = prev.filter((c) => c.name !== newSender.name);
      return [newSender, ...filtered].slice(0, 4);
    });
    setActiveChatUser(newSender);
    setIsChatOpen(true);
  }, []);

  useEffect(() => {
    const customEventListener = (event: Event) => {
      const customEvent = event as CustomEvent<ChatTarget>;
      if (customEvent.detail) {
        handleIncomingMessage(customEvent.detail);
      }
    };

    window.addEventListener("chat:incoming-message", customEventListener);
    return () => {
      window.removeEventListener("chat:incoming-message", customEventListener);
    };
  }, [handleIncomingMessage]);

  useEffect(() => {
    window["chat-get-from"] = (name: string, message?: string, avatarUrl?: string) => {
      const defaultAvatar =
        avatarUrl ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80";

      const sender: ChatTarget = {
        id: `sim-${Date.now()}`,
        name: name || "Anonymous",
        avatarUrl: defaultAvatar,
        account_id: `sim-${Date.now()}`,
        inbox_id: `sim-${Date.now()}`,
      };

      if (message) {
        if (!MOCK_CONVERSATIONS[name]) {
          MOCK_CONVERSATIONS[name] = [];
        }
        MOCK_CONVERSATIONS[name].push({
          id: Date.now(),
          text: message,
          sender: "them",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }

      handleIncomingMessage(sender);
    };

    Object.defineProperty(window, "chat", {
      get() {
        console.log(
          "%c 💬 Chat Simulator Template Ready:",
          "color: #a855f7; font-weight: bold; font-size: 13px;"
        );
        console.log('Use: window["chat-get-from"]("Name", "Message")');
        return 'window["chat-get-from"]("Name", "Message")';
      },
      configurable: true,
    });
  }, [handleIncomingMessage]);

  const openChatWithUser = (target?: ChatTarget) => {
    console.log("Opening chat with user:", target);
    if (target) {
      setActiveChatUser(target);
      setAccountId(target.account_id || null);
      setRecentChats((prev) => {
        const exists = prev.some((c) => c.name === target.name);
        if (!exists) return [target, ...prev].slice(0, 4);
        return prev;
      });
    } else if (!activeChatUser && recentChats.length > 0) {
      setActiveChatUser(recentChats[0]);
    }
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  return (
    <div className="flex min-h-screen relative">
      <UserNav />
      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: marginLeft }}
      >
        <Outlet context={{ openChatWithUser }} />
      </main>

      {/* Global Floating Chat Container */}
      <ChatMain
        isOpen={isChatOpen}
        onClose={closeChat}
        activeUser={activeChatUser}
        recentChats={recentChats}
        onSelectChat={(chat) => openChatWithUser(chat)}
        avatarPayload={avatarPayload}
        messages={chatMessages}
        isLoading={loadingMessages}
        onNewMessage={handleNewMessage}
        onRemoveChat={handleRemoveChat} // Pass the remove chat handler
      />

      {/* Global Scroll To Top Button */}
      <UtilScrollTop />
    </div>
  );
};

export default Layout;