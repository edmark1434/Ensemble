import axios from "axios";
import type { NavigateFunction } from "react-router-dom";
import toast from "react-hot-toast";
import useChatState from "@/components/ui/chat_bubble/chat_state";

type MarketplaceContextType = "job_proposal" | "gig_order";

interface OpenMarketplaceConversationOptions {
  contextType: MarketplaceContextType;
  contextId: string;
  navigate: NavigateFunction;
}

export async function openMarketplaceConversation({
  contextType,
  contextId,
  navigate,
}: OpenMarketplaceConversationOptions) {
  const normalizedContextId = String(contextId || "").trim();
  if (!normalizedContextId) {
    toast.error("The marketplace discussion could not be identified.");
    return;
  }

  try {
    const inbox = await useChatState.getState().createMarketplace({
      context_type: contextType,
      context_id: normalizedContextId,
    });
    const conversationId = String(inbox._id);
    navigate(
      `/inbox/marketplace?conversation=${encodeURIComponent(conversationId)}`,
      { state: { conversationId } }
    );
  } catch (error) {
    const message = axios.isAxiosError(error)
      ? error.response?.data?.error
      : null;
    toast.error(message || "Unable to open the marketplace discussion.");
  }
}
