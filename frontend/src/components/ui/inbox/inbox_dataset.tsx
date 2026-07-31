// src/pages/user/inbox/inbox_dataset.tsx

export interface Members {
  account_id: string;
  role: string;
  joined_at: Date;
}

export interface PinnedMessage {
  pinned_at: Date;
  pinned_by: string;
  message_id: string;
}

export interface Attachment {
  attachment_id: string;
  attachment_type: string;
  attachment_url: string;
}

export interface MessageReact {
  account_id: string;
  react_type: string;
}

export interface ReadBy {
  account_id: string;
  read_at: Date;
}

export interface Inbox {
  _id: string;
  conversation_name: string;
  conversation_type: string;
  contract_id: string;
  job_id: string;
  gig_id: string;
  members: Members[];
  pinned_messages: PinnedMessage[];
  created_at: Date;
  updated_at: Date;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface Message {
  _id: string;
  conversation_id: string;
  sender_id: number | string;
  message_type: string;
  message_content: string;
  message_id_reply: string;
  attachments: Attachment[];
  links: string[];
  message_react: MessageReact[];
  read_by: ReadBy[];
  is_edited: boolean;
  deleted_at: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================================
// Dummy Dataset
// ============================================================

export const DUMMY_INBOX_LIST: Inbox[] = [
  {
    _id: "dummy-conv-1",
    conversation_name: "Alex Morgan",
    conversation_type: "direct",
    contract_id: "",
    job_id: "",
    gig_id: "",
    members: [
      { account_id: "user1", role: "member", joined_at: new Date() },
      { account_id: "dummy-user-1", role: "member", joined_at: new Date() },
    ],
    pinned_messages: [],
    created_at: new Date(),
    updated_at: new Date(),
    last_message: "Hey! Let's touch base regarding the project layout.",
    last_message_time: new Date().toISOString(),
    unread_count: 1,
  },
  {
    _id: "dummy-conv-2",
    conversation_name: "Project Design Team",
    conversation_type: "group",
    contract_id: "",
    job_id: "",
    gig_id: "",
    members: [
      { account_id: "user1", role: "member", joined_at: new Date() },
      { account_id: "dummy-user-2", role: "member", joined_at: new Date() },
      { account_id: "dummy-user-3", role: "member", joined_at: new Date() },
    ],
    pinned_messages: [],
    created_at: new Date(),
    updated_at: new Date(),
    last_message: "The Figma wireframes have been updated.",
    last_message_time: new Date(Date.now() - 3600000).toISOString(),
    unread_count: 0,
  },
];

export const DUMMY_MESSAGES_MAP: Record<string, Message[]> = {
  "dummy-conv-1": [
    {
      _id: "msg-1",
      conversation_id: "dummy-conv-1",
      sender_id: "dummy-user-1",
      message_type: "text",
      message_content: "Hey there! Are you available to discuss the recent project updates?",
      message_id_reply: "",
      attachments: [],
      links: [],
      message_react: [],
      read_by: [],
      is_edited: false,
      deleted_at: new Date(),
      created_at: new Date(Date.now() - 7200000),
      updated_at: new Date(Date.now() - 7200000),
    },
    {
      _id: "msg-2",
      conversation_id: "dummy-conv-1",
      sender_id: "user1",
      message_type: "text",
      message_content: "Sure! I just finished reviewing the components.",
      message_id_reply: "",
      attachments: [],
      links: [],
      message_react: [],
      read_by: [],
      is_edited: false,
      deleted_at: new Date(),
      created_at: new Date(Date.now() - 3600000),
      updated_at: new Date(Date.now() - 3600000),
    },
    {
      _id: "msg-3",
      conversation_id: "dummy-conv-1",
      sender_id: "dummy-user-1",
      message_type: "text",
      message_content: "Hey! Let's touch base regarding the project layout.",
      message_id_reply: "",
      attachments: [],
      links: [],
      message_react: [],
      read_by: [],
      is_edited: false,
      deleted_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
  "dummy-conv-2": [
    {
      _id: "msg-4",
      conversation_id: "dummy-conv-2",
      sender_id: "dummy-user-2",
      message_type: "text",
      message_content: "The Figma wireframes have been updated.",
      message_id_reply: "",
      attachments: [],
      links: [],
      message_react: [],
      read_by: [],
      is_edited: false,
      deleted_at: new Date(),
      created_at: new Date(Date.now() - 3600000),
      updated_at: new Date(Date.now() - 3600000),
    },
  ],
};