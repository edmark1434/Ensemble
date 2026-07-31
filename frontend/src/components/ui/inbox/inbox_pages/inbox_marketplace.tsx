import React from "react";
import type { Inbox } from "../inbox_dataset";
import { InboxList } from "../inbox_components/inbox_list";

interface InboxMarketplaceProps {
  conversations: Inbox[];
  selectedConversation: Inbox | null;
  onSelectConversation: (inbox: Inbox) => void;
  loading: boolean;
  searchQuery: string;
  getConversationName: (inbox: Inbox) => string;
  getAvatar: (inbox: Inbox) => string;
  getAccountName?: (accountId: string) => string | undefined;
  formatTime: (dateString?: string | Date) => string;
  isCollapsed?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const InboxMarketplace: React.FC<InboxMarketplaceProps> = (props) => {
  return <InboxList {...props} />;
};
