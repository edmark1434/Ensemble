import { Outlet, useLocation } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import UserNav from "@/components/nav/user_nav.tsx";
import UtilScrollTop from "@/components/utility/util_scroll_top.tsx";
import useGlobalState from "@/lib/global_state.ts";
import { ChatMain } from "./chat_bubble/chat_main";
import { CallOverlay } from "./chat_bubble/chat_bubble_components/CallOverlay";
import VerificationRequiredModal from "@/components/ui/VerificationRequiredModal";
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
  const conversations = useChatState((state) => state.conversations);
  const floatingWindows = useChatState((state) => state.floatingWindows);
  const activeFloatingId = useChatState((state) => state.activeFloatingId);
  const unreadCounts = useChatState((state) => state.unreadCounts);

  const isInboxPage = location.pathname.startsWith("/inbox");
  const currentUserId = String(user?.account_id || "");

  const recentChats = useMemo(() => {
    const conversationTargets: ChatTarget[] = conversations.map((conv) => {
      const convId = String(conv._id);
      let targetName = conv.conversation_name || "";
      let targetAvatar: string | undefined = conv.conversation_image_key || undefined;
      let targetId = convId;
      let targetAccountId: string | undefined = undefined;

      if (conv.conversation_type === "direct") {
        const other = (conv.members || []).find(
          (m: any) => String(m.account_id) !== currentUserId
        );
        if (other) {
          targetName = other.name || other.username || targetName || "User";
          targetAvatar = other.avatar_preset_url || targetAvatar;
          targetId = String(other.account_id);
          targetAccountId = String(other.account_id);
        } else if (
          (conv.members || []).length === 1 &&
          String((conv.members || [])[0]?.account_id) === currentUserId
        ) {
          targetName = user?.name || user?.display_name || "Note to self";
          targetAvatar = user?.avatar_preset_url || user?.avatar_url;
          targetId = currentUserId;
          targetAccountId = currentUserId;
        }
      }

      if (!targetName) {
        targetName =
          conv.listing_title ||
          (conv.conversation_type === "group" ? "Group Chat" : "Conversation");
      }

      return {
        id: targetId,
        inbox_id: convId,
        account_id: targetAccountId,
        name: targetName,
        avatarUrl: targetAvatar,
        unreadCount: unreadCounts[convId] || conv.unread_count || 0,
        conversationType: conv.conversation_type,
        listingType: conv.listing_type,
        listingTitle: conv.listing_title,
      };
    });

    const existingIds = new Set(
      conversationTargets.map((c) => String(c.inbox_id || c.id))
    );
    const additionalFloating = floatingWindows
      .filter((fw) => !existingIds.has(String(fw.inbox_id || fw.id)))
      .map((fw) => ({
        ...fw,
        unreadCount:
          unreadCounts[String(fw.inbox_id || fw.id)] || fw.unreadCount || 0,
      }));

    return [...additionalFloating, ...conversationTargets];
  }, [conversations, currentUserId, floatingWindows, unreadCounts, user]);

  const activeChatUser =
    recentChats.find(
      (chat) =>
        String(chat.id) === String(activeFloatingId) ||
        String(chat.inbox_id) === String(activeFloatingId)
    ) ||
    floatingWindows.find(
      (chat) => String(chat.id) === String(activeFloatingId)
    ) ||
    null;

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
      <VerificationRequiredModal />
    </div>
  );
};

export default Layout;
