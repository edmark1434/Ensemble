import axios from "axios";
import type { NavigateFunction } from "react-router-dom";
import toast from "react-hot-toast";
import useChatState from "@/components/ui/chat_bubble/chat_state";
import useGlobalState from "@/lib/global_state";

type MarketplaceContextType = "job_proposal" | "gig_order";

interface OpenMarketplaceConversationOptions {
  contextType: MarketplaceContextType;
  contextId: string;
  navigate?: NavigateFunction;
  asFloatingWindow?: boolean;
  targetName?: string;
  targetAvatar?: string;
  listingTitle?: string;
}

export async function openMarketplaceConversation({
  contextType,
  contextId,
  navigate,
  asFloatingWindow = true,
  targetName: overrideTargetName,
  targetAvatar: overrideTargetAvatar,
  listingTitle: overrideListingTitle,
}: OpenMarketplaceConversationOptions) {
  const normalizedContextId = String(contextId || "").trim();
  if (!normalizedContextId) {
    toast.error("The marketplace discussion could not be identified.");
    return;
  }

  const isAlreadyOnInbox =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/inbox");

  const windowKey = `marketplace_${contextType}_${normalizedContextId}`;
  const tempId = `temp_${contextType}_${normalizedContextId}`;

  // If floating mode is requested, open the floating window immediately in skeleton state with stable windowKey
  if (asFloatingWindow && !isAlreadyOnInbox) {
    const tempTarget = {
      windowId: windowKey,
      id: windowKey,
      inbox_id: tempId,
      name: overrideTargetName || "Applicant",
      avatarUrl: overrideTargetAvatar,
      listingType: (contextType === "job_proposal" ? "job" : "gig") as "job" | "gig",
      listingTitle: overrideListingTitle || "Marketplace Chat",
    };

    useChatState.setState((state) => {
      const exists = state.floatingWindows.some(
        (w) =>
          w.windowId === windowKey ||
          String(w.id) === windowKey ||
          String(w.inbox_id) === tempId
      );
      const updatedWindows = exists
        ? state.floatingWindows.map((w) =>
            w.windowId === windowKey ||
            String(w.id) === windowKey ||
            String(w.inbox_id) === tempId
              ? { ...w, ...tempTarget }
              : w
          )
        : [
            tempTarget,
            ...state.floatingWindows.filter(
              (w) =>
                w.windowId !== windowKey &&
                String(w.id) !== windowKey &&
                String(w.inbox_id) !== tempId
            ),
          ].slice(0, 4);

      return {
        floatingWindows: updatedWindows,
        activeFloatingId: windowKey,
        activeConversationId: tempId,
        isFloatingOpen: true,
        loadingMessages: {
          ...state.loadingMessages,
          [tempId]: true,
          [windowKey]: true,
        },
      };
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chat:open-window", {
          detail: {
            conversationId: tempId,
            targetId: windowKey,
            windowId: windowKey,
            target: tempTarget,
          },
        })
      );
    }
  }

  try {
    const inbox = await useChatState.getState().createMarketplace({
      context_type: contextType,
      context_id: normalizedContextId,
    });
    const conversationId = String(inbox._id);

    if (asFloatingWindow && !isAlreadyOnInbox) {
      const currentUser = useGlobalState.getState().user;
      const currentUserId = String(
        currentUser?.account_id || useChatState.getState().currentUserId || ""
      );

      const isGenericName =
        !inbox.conversation_name ||
        inbox.conversation_name === "Marketplace Chat" ||
        ((inbox as any).listing_title && inbox.conversation_name === (inbox as any).listing_title);

      let targetName =
        overrideTargetName ||
        (isGenericName ? undefined : inbox.conversation_name);
      let targetAvatar: string | undefined = overrideTargetAvatar;
      let targetAccountId: string | undefined = undefined;

      const members = (inbox as any).members || [];
      const other = members.find(
        (m: any) => String(m.account_id) !== currentUserId
      );
      if (other) {
        targetName =
          targetName ||
          other.name ||
          other.display_name ||
          other.username;
        targetAvatar =
          targetAvatar ||
          other.avatar_preset_url ||
          other.avatar_url ||
          other.avatar;
        targetAccountId = String(other.account_id);
      }

      if (!targetName) {
        targetName = overrideListingTitle || (inbox as any).listing_title || "Marketplace Chat";
      }

      const confirmedTarget = {
        windowId: windowKey, // CRITICAL: Preserves stable key so React does NOT unmount or exit/enter animate
        id: conversationId,
        inbox_id: conversationId,
        account_id: targetAccountId,
        name: targetName,
        avatarUrl: targetAvatar,
        conversationType: inbox.conversation_type || "marketplace_job",
        listingType:
          (inbox as any).listing_type ||
          (contextType === "job_proposal" ? "job" : "gig"),
        listingTitle:
          overrideListingTitle ||
          (inbox as any).listing_title ||
          inbox.conversation_name,
      };

      // Seamlessly mutate the existing window in place with zero unmount/remount
      useChatState.setState((state) => {
        const { [tempId]: _, [windowKey]: __, ...restLoading } = state.loadingMessages;
        const nextWindows = state.floatingWindows.map((w) => {
          if (
            w.windowId === windowKey ||
            String(w.id) === windowKey ||
            String(w.inbox_id) === tempId ||
            String(w.inbox_id) === conversationId
          ) {
            return confirmedTarget;
          }
          return w;
        });

        const exists = nextWindows.some(
          (w) => String(w.inbox_id || w.id) === conversationId || w.windowId === windowKey
        );
        const finalWindows = exists
          ? nextWindows
          : [confirmedTarget, ...nextWindows].slice(0, 4);

        return {
          floatingWindows: finalWindows,
          activeFloatingId: conversationId,
          activeConversationId: conversationId,
          isFloatingOpen: true,
          unreadCounts: { ...state.unreadCounts, [conversationId]: 0 },
          loadingMessages: { ...restLoading, [conversationId]: true },
        };
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chat:open-window", {
            detail: {
              conversationId,
              targetId: conversationId,
              windowId: windowKey,
              target: confirmedTarget,
            },
          })
        );
      }

      await useChatState.getState().loadConversation(conversationId, true);
      useChatState.getState().markConversationRead(conversationId);
      return;
    }

    if (navigate) {
      navigate(
        `/inbox/marketplace?conversation=${encodeURIComponent(conversationId)}`,
        { state: { conversationId } }
      );
    }
  } catch (error) {
    useChatState.setState((state) => {
      const { [tempId]: _1, [windowKey]: _2, ...restLoading } = state.loadingMessages;
      return {
        floatingWindows: state.floatingWindows.filter(
          (w) =>
            w.windowId !== windowKey &&
            String(w.id) !== windowKey &&
            String(w.inbox_id) !== tempId
        ),
        loadingMessages: restLoading,
        activeFloatingId:
          state.activeFloatingId === windowKey || state.activeFloatingId === tempId
            ? null
            : state.activeFloatingId,
        activeConversationId:
          state.activeConversationId === tempId
            ? null
            : state.activeConversationId,
      };
    });
    const message = axios.isAxiosError(error)
      ? error.response?.data?.error
      : null;
    toast.error(message || "Unable to open the marketplace discussion.");
  }
}
