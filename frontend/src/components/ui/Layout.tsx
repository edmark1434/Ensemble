import { Outlet, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import UserNav from "@/components/nav/user_nav.tsx";
import UtilScrollTop from "@/components/utility/util_scroll_top.tsx";
import useGlobalState from "@/lib/global_state.ts";
import { ChatMain } from "./chat_bubble/chat_main";
import { CallOverlay } from "./chat_bubble/chat_bubble_components/CallOverlay";
import useChatState, {
  type ChatTarget,
} from "./chat_bubble/chat_state";

export type { ChatTarget } from "./chat_bubble/chat_state";

declare global {
  interface Window {
    "chat-get-from"?: (
      name: string,
      message?: string,
      avatarUrl?: string
    ) => void;
    chat?: unknown;
  }
}

export const emitIncomingMessage = (sender: ChatTarget) => {
  window.dispatchEvent(
    new CustomEvent("chat:incoming-message", { detail: sender })
  );
};

const Layout = () => {
  const location = useLocation();
  const user = useGlobalState((state) => state.user);
  const isSidebarCollapsed = useGlobalState((state) => state.isSidebarCollapsed);
  const initializeChat = useChatState((state) => state.initialize);
  const openDirectChat = useChatState((state) => state.openDirectChat);
  const openFloatingConversation = useChatState(
    (state) => state.openFloatingConversation
  );
  const removeFloatingWindow = useChatState(
    (state) => state.removeFloatingWindow
  );
  const floatingWindows = useChatState((state) => state.floatingWindows);
  const activeFloatingId = useChatState((state) => state.activeFloatingId);
  const unreadCounts = useChatState((state) => state.unreadCounts);

  const isInboxPage = location.pathname.startsWith("/inbox");
  const activeChatUser =
    floatingWindows.find(
      (chat) => String(chat.id) === String(activeFloatingId)
    ) || null;
  const recentChats = floatingWindows.map((chat) => ({
    ...chat,
    unreadCount: unreadCounts[String(chat.id)] || 0,
  }));

  // Dynamic margin left based on sidebar state
  const marginLeft = isSidebarCollapsed ? "5rem" : "16rem";

  useEffect(() => {
    if (user?.account_id) initializeChat(String(user.account_id));
  }, [user?.account_id, initializeChat]);

  const openChatWithUser = useCallback(
    (target?: ChatTarget) => {
      if (!target) {
        const firstChat = floatingWindows[0];
        if (firstChat) {
          void openFloatingConversation(firstChat).catch((error) =>
            console.error("Unable to open chat:", error)
          );
        }
        return;
      }
      if (target.inbox_id) {
        void openFloatingConversation(target).catch((error) =>
          console.error("Unable to open chat:", error)
        );
      } else {
        void openDirectChat(target).catch((error) =>
          console.error("Unable to open direct chat:", error)
        );
      }
    },
    [floatingWindows, openDirectChat, openFloatingConversation]
  );

  useEffect(() => {
    const handleIncomingMessage = (event: Event) => {
      const target = (event as CustomEvent<ChatTarget>).detail;
      if (target) openChatWithUser(target);
    };
    window.addEventListener("chat:incoming-message", handleIncomingMessage);
    return () =>
      window.removeEventListener("chat:incoming-message", handleIncomingMessage);
  }, [openChatWithUser]);

  useEffect(() => {
    window["chat-get-from"] = (
      name: string,
      _message?: string,
      avatarUrl?: string
    ) => {
      openChatWithUser({
        id: name,
        name: name || "Anonymous",
        avatarUrl,
      });
    };
    Object.defineProperty(window, "chat", {
      get: () => 'window["chat-get-from"]("Name")',
      configurable: true,
    });
  }, [openChatWithUser]);

  return (
    <div className="flex min-h-screen relative">
      <UserNav />
      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft }}
      >
        <Outlet context={{ openChatWithUser }} />
      </main>

      {!isInboxPage && (
        <ChatMain
          activeUser={activeChatUser}
          recentChats={recentChats}
          onSelectChat={(chat) => void openFloatingConversation(chat)}
          onRemoveChat={removeFloatingWindow}
        />
      )}
      <CallOverlay />

      <UtilScrollTop />
    </div>
  );
};

export default Layout;
