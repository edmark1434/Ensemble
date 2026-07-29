// src/components/ui/inbox/inbox_pages/inbox_direct.tsx
import React from "react";
import type { Inbox } from "../inbox_dataset";
import { InboxList } from "../inbox_components/inbox_list";

interface InboxDirectProps {
  conversations: Inbox[];
  selectedConversation: Inbox | null;
  onSelectConversation: (inbox: Inbox) => void;
  loading: boolean;
  searchQuery: string;
  getConversationName: (inbox: Inbox) => string;
  getAvatar: (inbox: Inbox) => string;
  formatTime: (dateString?: string | Date) => string;
  isCollapsed?: boolean;
}

export const InboxDirect: React.FC<InboxDirectProps> = (props) => {
  return <InboxList {...props} />;
};