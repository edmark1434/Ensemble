import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStaffPlatformGuard } from "@/components/staff/StaffPlatformView";
import { isStaffPlatformViewer, isStaffPreviewFrame, staffPreviewViewFallback, STAFF_PREVIEW_NAV_MESSAGE } from "@/lib/staffPlatformView";
import { useCallback, useEffect, useMemo, useState } from "react";
import UserNav from "@/components/nav/user_nav.tsx";
import UtilScrollTop from "@/components/utility/util_scroll_top.tsx";
import useGlobalState from "@/lib/global_state.ts";
import { isAppealLimitedMember } from "@/lib/appealAccess";
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
  const navigate = useNavigate();
  const user = useGlobalState((state) => state.user);
  const isSidebarCollapsed = useGlobalState((state) => state.isSidebarCollapsed);
  const setIsSidebarCollapsed = useGlobalState((state) => state.setIsSidebarCollapsed);
  const initializeChat = useChatState((state) => state.initialize);

  // Auto-collapse sidebar when viewport is narrow (< 1024px)
  useEffect(() => {
    let wasAutoCollapsed = false;
    let prevWidth = window.innerWidth;

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const wentNarrow = prevWidth >= 1024 && currentWidth < 1024;
      const wentWide = prevWidth < 1024 && currentWidth >= 1024;
      prevWidth = currentWidth;

      const currentCollapsed = useGlobalState.getState().isSidebarCollapsed;

      if (wentNarrow && !currentCollapsed) {
        setIsSidebarCollapsed(true);
        wasAutoCollapsed = true;
      } else if (wentWide && currentCollapsed && wasAutoCollapsed) {
        setIsSidebarCollapsed(false);
        wasAutoCollapsed = false;
      }
    };

    // Auto-collapse on initial mount if screen is already narrow
    if (window.innerWidth < 1024 && !useGlobalState.getState().isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
      wasAutoCollapsed = true;
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setIsSidebarCollapsed]);
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

  const isStaffView = isStaffPlatformViewer(user);
  useStaffPlatformGuard(isStaffView);

  useEffect(() => {
    if (!isStaffPreviewFrame()) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; path?: string } | null;
      if (!data || data.type !== STAFF_PREVIEW_NAV_MESSAGE) return;
      const path = String(data.path || "");
      if (!path.startsWith("/") || path.startsWith("//")) return;
      navigate(staffPreviewViewFallback(path) || path);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);

  useEffect(() => {
    if (!isStaffView) return;
    const fallback = staffPreviewViewFallback(location.pathname);
    if (!fallback || fallback === location.pathname) return;
    navigate(fallback, { replace: true });
  }, [isStaffView, location.pathname, navigate]);

  const isInboxPage = location.pathname.startsWith("/inbox");
  const isTeamProjectChat =
    (location.pathname.startsWith("/team-project") || location.pathname.startsWith("/team-projects")) &&
    new URLSearchParams(location.search).get("tab") === "chat";
  const isFloatingChatHidden = useGlobalState((state) => state.isFloatingChatHidden);

  const shouldHideFloatingChat = isInboxPage || isStaffView || isTeamProjectChat || isFloatingChatHidden || isAppealLimitedMember(user);
  const hasBottomStickyBar =
    location.pathname.startsWith("/jobs/proposals/received/") ||
    location.pathname.startsWith("/jobs/proposals/incoming/details/") ||
    location.pathname.startsWith("/jobs/proposals/sent/");
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
      } else if (conv.conversation_type !== "group") {
        const other = (conv.members || []).find(
          (m: any) => String(m.account_id) !== currentUserId
        );
        if (other) {
          const isNameListingTitle = conv.listing_title && conv.conversation_name === conv.listing_title;
          targetName = (!isNameListingTitle && conv.conversation_name) || other.name || other.username || conv.listing_title || "User";
          targetAvatar = other.avatar_preset_url || targetAvatar;
          targetAccountId = String(other.account_id);
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

    const floatingMap = new Map(
      floatingWindows.map((fw) => [String(fw.inbox_id || fw.id), fw])
    );
    const mergedTargets = conversationTargets.map((ct) => {
      const fw = floatingMap.get(String(ct.inbox_id || ct.id));
      if (fw) {
        return {
          ...ct,
          name: fw.name || ct.name,
          avatarUrl: fw.avatarUrl || ct.avatarUrl,
        };
      }
      return ct;
    });
    const existingIds = new Set(
      mergedTargets.map((c) => String(c.inbox_id || c.id))
    );
    const additionalFloating = floatingWindows
      .filter((fw) => !existingIds.has(String(fw.inbox_id || fw.id)))
      .map((fw) => ({
        ...fw,
        unreadCount:
          unreadCounts[String(fw.inbox_id || fw.id)] || fw.unreadCount || 0,
      }));

    return [...additionalFloating, ...mergedTargets];
  }, [conversations, currentUserId, floatingWindows, unreadCounts, user]);

  const activeChatUser =
    recentChats.find(
      (chat) =>
        String(chat.id) === String(activeFloatingId) ||
        String(chat.inbox_id) === String(activeFloatingId) ||
        (chat.account_id && String(chat.account_id) === String(activeFloatingId))
    ) ||
    floatingWindows.find(
      (chat) =>
        String(chat.id) === String(activeFloatingId) ||
        String(chat.inbox_id) === String(activeFloatingId) ||
        (chat.account_id && String(chat.account_id) === String(activeFloatingId))
    ) ||
    null;

  // Dynamic margin left based on sidebar state
  const marginLeft = isSidebarCollapsed ? "5rem" : "16rem";

  const appealOnly = isAppealLimitedMember(user);

  useEffect(() => {
    if (isStaffView || appealOnly) return;
    if (user?.account_id) initializeChat(String(user.account_id));
  }, [isStaffView, appealOnly, user?.account_id, initializeChat]);

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
    <div
      className={`flex relative w-full ${
        isInboxPage ? "h-screen overflow-hidden" : "min-h-screen"
      } print:min-h-0 print:block print:w-full print:m-0 print:p-0`}
    >
      <div className="print:hidden">
        <UserNav />
      </div>
      <main
        className={`flex-1 transition-all duration-300 min-w-0 flex flex-col print:p-0 print:m-0 print:w-full print:block ${
          isInboxPage ? "h-screen overflow-hidden" : "min-h-screen"
        }`}
        style={{ paddingLeft: marginLeft }}
      >
        <style>{`
          @media print {
            main {
              padding-left: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              display: block !important;
            }
          }
        `}</style>
        {isStaffView && (
          <style>
            {`[data-staff-preview-hide]{display:none !important;}`}
          </style>
        )}
        <Outlet context={{ openChatWithUser }} />
      </main>

      <div className="print:hidden">
        {!shouldHideFloatingChat && (
          <ChatMain
            activeUser={activeChatUser}
            recentChats={recentChats}
            onSelectChat={(chat) => void openFloatingConversation(chat)}
            onRemoveChat={removeFloatingWindow}
            bottomOffset={hasBottomStickyBar ? 84 : 12}
          />
        )}
        {!isStaffView && <CallOverlay />}

        <UtilScrollTop />
        <VerificationRequiredModal />
      </div>
    </div>
  );
};

export default Layout;
