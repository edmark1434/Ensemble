import { useMemo } from "react";
import useChatState from "./chat_state";

export const DIRECT_CONVERSATION_TYPES = new Set(["direct", "group", "ticket", "dispute"]);
export const MARKETPLACE_CONVERSATION_TYPES = new Set([
  "engagement",
  "marketplace_job",
  "marketplace_gig",
  "revision",
]);

export function isMarketplaceConversation(conversation: any): boolean {
  if (!conversation) return false;
  if (conversation.team_id || conversation.job_id || conversation.contract_id || conversation.listing_type) {
    return true;
  }
  return MARKETPLACE_CONVERSATION_TYPES.has(conversation.conversation_type || "");
}

export function useInboxUnreadTotals() {
  const conversations = useChatState((state) => state.conversations);
  const unreadCounts = useChatState((state) => state.unreadCounts);

  return useMemo(() => {
    let direct = 0;
    let marketplace = 0;
    for (const conversation of conversations) {
      const id = String(conversation._id);
      const count = unreadCounts[id] ?? conversation.unread_count ?? 0;
      if (count <= 0) continue;
      if (isMarketplaceConversation(conversation)) marketplace += count;
      else direct += count;
    }
    return { direct, marketplace, total: direct + marketplace };
  }, [conversations, unreadCounts]);
}

export function formatUnreadBadge(count: number): string {
  return count > 99 ? "99+" : String(count);
}
