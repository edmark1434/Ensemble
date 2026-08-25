export interface Members {
  account_id: string;
  role: string;
  status?: "active" | "left" | "removed";
  joined_at: Date | string;
}

export interface PinnedMessage {
  pinned_at: Date | string;
  pinned_by: string;
  message_id: string;
}

export interface Attachment {
  attachment_id: string;
  attachment_type: string;
  attachment_url: string;
  attachment_key?: string;
  attachment_name?: string;
  attachment_size?: number;
}

export interface MessageReact {
  account_id: string;
  react_type: string;
}

export interface ReadBy {
  account_id: string;
  read_at: Date | string;
}

export interface Inbox {
  _id: string;
  conversation_name: string;
  conversation_image_key?: string;
  conversation_type: string;
  contract_id?: string;
  job_id?: string;
  gig_id?: string;
  proposal_id?: string;
  gig_request_id?: string;
  engagement_id?: string;
  asset_id?: string;
  ticket_id?: string;
  support_ticket_id?: string;
  dispute_id?: string;
  client_account_id?: string;
  freelancer_account_id?: string;
  client_context_path?: string;
  freelancer_context_path?: string;
  marketplace_status?: string;
  marketplace_amount_credits?: number;
  ticket_details?: {
    ticket_number?: string | null;
    subject?: string | null;
    description?: string | null;
    type?: string | null;
    priority?: string | null;
    status?: string | null;
  };
  listing_type?: "job" | "gig" | "asset" | string;
  listing_title?: string;
  listing_preview?: string;
  listing_path?: string;
  is_group?: boolean;
  creator_id?: string;
  members: Members[];
  pinned_messages: PinnedMessage[];
  created_at: Date | string;
  updated_at: Date | string;
  last_message?: string;
  last_message_sender_id?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface Message {
  _id: string;
  conversation_id: string;
  sender_id: number | string;
  author_type?: "staff" | "user" | string;
  author_name?: string;
  message_type: string;
  message_content: string;
  message_id_reply: string;
  attachments: Attachment[];
  links: string[];
  message_react: MessageReact[];
  read_by: ReadBy[];
  is_edited: boolean;
  is_deleted?: boolean;
  is_unsent?: boolean;
  deleted_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}
