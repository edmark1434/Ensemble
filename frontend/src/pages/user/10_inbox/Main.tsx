import React, { useState } from "react";
import {
  MessageSquare,
  Search,
  Phone,
  Video,
  Image as ImageIcon,
  Send,
  MoreVertical,
  ChevronLeft,
  Inbox as InboxIcon,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isOnline: boolean;
  statusText?: string;
}

interface Message {
  id: number;
  senderId: "me" | "them";
  text: string;
  time: string;
}

// Mock Data for the different tabs
const MOCK_CHATS: Record<"primary" | "requests" | "drafts", Chat[]> = {
  primary: [
    { id: 1, name: "Robert Simion", avatar: "https://placehold.co/100x100/3b82f6/fff?text=RS", lastMessage: "Let's use the premium tools for this track.", time: "4m ago", unreadCount: 2, isOnline: true, statusText: "Active now" },
    { id: 2, name: "Sarah Chen", avatar: "https://placehold.co/100x100/eab308/fff?text=SC", lastMessage: "The cinematic trailer cut looks amazing!", time: "2h ago", unreadCount: 0, isOnline: false, statusText: "Active 2h ago" },
    { id: 3, name: "Marcus Thompson", avatar: "https://placehold.co/100x100/2dd4bf/fff?text=MT", lastMessage: "Sent you the raw 4K nature footage.", time: "1d ago", unreadCount: 0, isOnline: true, statusText: "Active now" },
  ],
  requests: [
    { id: 4, name: "David Kim", avatar: "https://placehold.co/100x100/a855f7/fff?text=DK", lastMessage: "Hey, I want to collaborate on a new LUTs bundle.", time: "5h ago", unreadCount: 1, isOnline: false },
    { id: 5, name: "Emma Watson", avatar: "https://placehold.co/100x100/ec4899/fff?text=EW", lastMessage: "Can you edit a quick sequence for me?", time: "3d ago", unreadCount: 3, isOnline: false },
  ],
  drafts: [
    { id: 6, name: "Jessica Martinez", avatar: "https://placehold.co/100x100/f97316/fff?text=JM", lastMessage: "[Draft] Hey Jessica, regarding the motion graphics...", time: "Just now", unreadCount: 0, isOnline: true },
  ]
};

const INITIAL_MESSAGES: Record<number, Message[]> = {
  1: [
    { id: 1, senderId: "them", text: "Hey! Did you check out the new sound effects pack?", time: "10:14 AM" },
    { id: 2, senderId: "me", text: "Yeah, it sounds insanely crisp. Perfect for the industrial theme project.", time: "10:15 AM" },
    { id: 3, senderId: "them", text: "Let's use the premium tools for this track.", time: "10:16 AM" },
  ],
  2: [
    { id: 1, senderId: "me", text: "How's the rendering coming along?", time: "Yesterday" },
    { id: 2, senderId: "them", text: "The cinematic trailer cut looks amazing!", time: "Yesterday" },
  ],
  3: [
    { id: 1, senderId: "them", text: "Sent you the raw 4K nature footage.", time: "2 days ago" },
  ]
};

const Inbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"primary" | "requests" | "drafts">("primary");
  const [selectedChatId, setSelectedChatId] = useState<number | null>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [conversations, setConversations] = useState<Record<number, Message[]>>(INITIAL_MESSAGES);
  const [chatsData, setChatsData] = useState<Record<"primary" | "requests" | "drafts", Chat[]>>(MOCK_CHATS);

  // Mobile navigation helper
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(true);

  const activeChats = chatsData[activeTab].filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentChat = [...chatsData.primary, ...chatsData.requests, ...chatsData.drafts].find(
    c => c.id === selectedChatId
  );

  const currentMessages = selectedChatId ? conversations[selectedChatId] || [] : [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChatId) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessage: Message = {
      id: Date.now(),
      senderId: "me",
      text: messageInput,
      time: timeString
    };

    // Update messages local state array
    setConversations(prev => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), newMessage]
    }));

    // Update last message preview in sidebar
    setChatsData(prev => {
      const updated = { ...prev };
      const list = updated[activeTab];
      const index = list.findIndex(c => c.id === selectedChatId);
      if (index !== -1) {
        list[index] = {
          ...list[index],
          lastMessage: messageInput,
          time: "Just now"
        };
      }
      return updated;
    });

    setMessageInput("");
  };

  const selectChat = (id: number) => {
    setSelectedChatId(id);
    setIsMobileChatOpen(true);

    // Clear unread badge locally for UI simulation
    setChatsData(prev => {
      const updated = { ...prev };
      const list = updated[activeTab];
      const index = list.findIndex(c => c.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], unreadCount: 0 };
      }
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-[#080a12] flex flex-col h-screen overflow-hidden">
      <UserHeader pageTitle="Inbox" credits={1250} />

      {/* Inbox Workspace Wrap */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 md:p-6 gap-4 h-[calc(100vh-80px)] overflow-hidden">

        {/* SIDEBAR: Chat List Section */}
        <div className={`w-full md:w-80 lg:w-96 border border-white/10 bg-white/5 rounded-2xl flex flex-col backdrop-blur-xl ${
          isMobileChatOpen && selectedChatId ? "hidden md:flex" : "flex"
        }`}>

          {/* Internal Navigation Filter Tabs */}
          <div className="grid grid-cols-3 border-b border-white/10 p-2 gap-1 text-center text-xs font-semibold">
            {(["primary", "requests", "drafts"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedChatId(null); }}
                className={`py-2 rounded-lg capitalize transition-all duration-200 ${
                  activeTab === tab 
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="p-3 border-b border-white/10 relative">
            <Search className="absolute left-6 top-5.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search chat thread..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-sm rounded-xl pl-9 pr-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/40"
            />
          </div>

          {/* Chat Rows Scroll Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {activeChats.length > 0 ? (
              activeChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => selectChat(chat.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition duration-200 ${
                    selectedChatId === chat.id 
                      ? "bg-white/10 border border-white/10" 
                      : "border border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img src={chat.avatar} alt={chat.name} className="w-11 h-11 rounded-full object-cover" />
                    {chat.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#080a12] rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="text-sm font-semibold text-white truncate">{chat.name}</h4>
                      <span className="text-[10px] text-zinc-500 flex-shrink-0">{chat.time}</span>
                    </div>
                    <p className={`text-xs truncate ${chat.unreadCount > 0 ? "text-white font-medium" : "text-zinc-400"}`}>
                      {chat.lastMessage}
                    </p>
                  </div>

                  {chat.unreadCount > 0 && (
                    <div className="bg-blue-500 text-white font-bold text-[10px] h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center animate-pulse">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
                <InboxIcon className="h-8 w-8 stroke-1 text-zinc-600" />
                <p className="text-xs">No active threads here</p>
              </div>
            )}
          </div>
        </div>

        {/* MAIN PANEL: Conversation Area */}
        <div className={`flex-1 border border-white/10 bg-gradient-to-b from-white/5 to-transparent rounded-2xl flex flex-col backdrop-blur-xl overflow-hidden relative ${
          !isMobileChatOpen || !selectedChatId ? "hidden md:flex" : "flex"
        }`}>
          {currentChat ? (
            <>
              {/* Active Header Panel */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/20">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setIsMobileChatOpen(false)}
                    className="p-1 text-zinc-400 hover:text-white md:hidden mr-1 rounded-lg hover:bg-white/5"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="relative flex-shrink-0">
                    <img src={currentChat.avatar} alt={currentChat.name} className="w-10 h-10 rounded-full object-cover" />
                    {currentChat.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#080a12] rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{currentChat.name}</h3>
                    <p className="text-[10px] text-zinc-400 truncate">{currentChat.statusText || "Offline"}</p>
                  </div>
                </div>

                {/* Calling & Management Triggers */}
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <button className="p-2 hover:text-white rounded-xl hover:bg-white/5 transition" title="Voice Call (Disabled)">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button className="p-2 hover:text-white rounded-xl hover:bg-white/5 transition" title="Video Call (Disabled)">
                    <Video className="h-4 w-4" />
                  </button>
                  <button className="p-2 hover:text-white rounded-xl hover:bg-white/5 transition">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Message Flow Dynamic Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col">
                <div className="text-center my-6 flex flex-col items-center">
                  <img src={currentChat.avatar} alt="" className="w-16 h-16 rounded-full border border-white/10 shadow-xl mb-2" />
                  <h4 className="text-white font-bold text-base">{currentChat.name}</h4>
                  <p className="text-xs text-zinc-500 max-w-xs mt-1">This is the absolute beginning of your direct message history with this collaborator.</p>
                </div>

                {currentMessages.map((msg) => {
                  const isMe = msg.senderId === "me";
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[75%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
                      <div className={`p-3 text-sm rounded-2xl leading-relaxed break-words ${
                        isMe 
                          ? "bg-blue-500 text-white rounded-tr-none" 
                          : "bg-white/10 text-zinc-100 rounded-tl-none border border-white/5"
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1 px-1">{msg.time}</span>
                    </div>
                  );
                })}
              </div>

              {/* Message Composer Footer Form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-zinc-950/10">
                <div className="relative flex items-center bg-white/5 border border-white/5 rounded-xl p-1.5 focus-within:border-blue-500/40 transition">
                  <button
                    type="button"
                    className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition flex-shrink-0"
                    title="Attach Picture (Mocked)"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    placeholder={`Message ${currentChat.name}...`}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="w-full bg-transparent text-sm text-white px-2 focus:outline-none py-1.5 placeholder-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className={`p-2 rounded-lg flex-shrink-0 transition ${
                      messageInput.trim() 
                        ? "bg-blue-500 text-white hover:bg-blue-600" 
                        : "text-zinc-500 bg-white/5 cursor-not-allowed"
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3 p-6 text-center">
              <div className="p-4 bg-white/5 rounded-full border border-white/5">
                <MessageSquare className="h-8 w-8 text-zinc-400 stroke-1" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">No Thread Selected</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">Choose an existing conversation from your layout stack tabs to begin formatting live interactions.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Embedded CSS Scrollbars Injection */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 99px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  );
};

export default Inbox;