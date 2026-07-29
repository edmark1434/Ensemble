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
  formatTime: (dateString?: string | Date) => string;
}

export const InboxMarketplace: React.FC<InboxMarketplaceProps> = (props) => {
  return <InboxList {...props} />;
};