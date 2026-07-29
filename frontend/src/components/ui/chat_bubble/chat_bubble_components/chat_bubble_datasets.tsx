import type { ChatTarget } from "@/components/ui/Layout";

export interface Message {
  id: number;
  text: string;
  sender: "me" | "them";
  time: string;
  createdAt?: string; // Optional timestamp for when the message was created
  isRead?: boolean; // Optional flag to indicate if the message has been read
  isEdited?: boolean; // Optional flag to indicate if the message has been edited
}

// Dataset updated with 4 chat mates
export const DEFAULT_CHAT_MATES: ChatTarget[] = [
  {
    id: "user-1",
    name: "Named Person 1",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "user-2",
    name: "Rene Baterbona the Hero of Mindanao",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "user-3",
    name: "Nabunturan",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "user-4",
    name: "soraaaa",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
  },
];

// Initial mock conversation histories
export const MOCK_CONVERSATIONS: Record<string, Message[]> = {
  "Named Person 1": [
    { id: 1, text: "naa diring mga verification?", sender: "me", time: "6:07 PM" },
    {
      id: 2,
      text: "tabangan nya tika admin bro sa katong account managementt",
      sender: "me",
      time: "6:07 PM",
    },
    { id: 3, text: "E fix ko na run gabii", sender: "them", time: "6:38 PM" },
  ],
  "Rene Baterbona the Hero of Mindanao": [
    {
      id: 1,
      text: "Hey! Did you review the capstone proposal?",
      sender: "them",
      time: "2:15 PM",
    },
    {
      id: 2,
      text: "Yes! Looking good, just checking the UI layout now.",
      sender: "me",
      time: "2:18 PM",
    },
  ],
  "Justin KuanKuan Nabunturan": [
    { id: 1, text: "Bro, check the new asset library updates.", sender: "them", time: "1:05 PM" },
    { id: 2, text: "On it! Will test the uploads.", sender: "me", time: "1:10 PM" },
  ],
  soraaaa: [
    { id: 1, text: "Yo, are we pushing the new build today?", sender: "them", time: "11:20 AM" },
  ],
};