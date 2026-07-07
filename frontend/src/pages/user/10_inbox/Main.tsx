// src/pages/user/inbox/Inbox.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Send,
  Paperclip,
  Video,
  MoreVertical,
  Search,
  UserPlus,
  ArrowLeft,
  CheckCheck,
  Share2,
  Users,
  Briefcase,
  Image,
  FileText
} from "lucide-react";
import socket from "@/lib/socket";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state"

interface Members {
  account_id: string;
  role: string;
  joined_at: Date;
}

interface PinnedMessage {
  pinned_at: Date;
  pinned_by: string;
  message_id: string;
}

interface Attachment {
  attachment_id: string;
  attachment_type: string;
  attachment_url: string;
}

interface MessageReact {
  account_id: string;
  react_type: string;
}

interface ReadBy {
  account_id: string;
  read_at: Date;
}

interface Inbox {
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

interface Message {
  _id: string;
  conversation_id: string;
  sender_id: string;
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


const Inbox = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [activeTab, setActiveTab] = useState<"direct" | "engagement">("direct");
  const [inboxList, setInboxList] = useState<Inbox[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Inbox | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const { user } = useGlobalState();
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const checkMessageSender = (message: Message): boolean => {
    return message.sender_id === user?.account_id || message.sender_id === "user1";
  }

  const handleSendMessage = () => {
    const trimmed = messageInput.trim();
    if (!trimmed) return;
    console.log("Sending message:", trimmed);
    setMessageInput("");
  };

  // Socket connection
  useEffect(() => {
    socket.connect();
    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });
    
    socket.on("disconnect", () => {
      console.log("Disconnected");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [messages]);

  // Fetch inbox data when tab changes
  useEffect(() => {
    const fetchInbox = async () => {
      setLoading(true);
      try {
        const response = await api.get(`api/inbox/${activeTab}`);
        console.log('Fetched inbox:', response.data);
        setInboxList(response.data);
        if (response.data.length > 0) {
          setSelectedConversation(response.data[0]);
        }else{
          setSelectedConversation(null);
        }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
      } catch (error) {
        console.error('Error fetching inbox:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
  }, [activeTab]);

  useEffect(() => {
    if (!selectedConversation) return;
    
    socket.emit("joinRoom", selectedConversation._id);
    const fetchMessages = async () => {
      try {
        setMessageLoading(true);
        const response = await api.get(`api/inbox/conversation/${selectedConversation._id}`);
        console.log('Fetched messages:', response.data);
        setMessages(response.data.Messages);  
      } catch (err) {
        console.error('Error fetching messages:', err);
        // Use sample messages for static display
        setMessages([]);
      } finally {
        setMessageLoading(false);
      }
    };
    fetchMessages();
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getConversationName = (inbox: Inbox): string => {
    if (inbox.conversation_name) return inbox.conversation_name;
    if (inbox.conversation_type === 'direct') {
      const otherMember = inbox.members.find(m => m.account_id !== user?.account_id);
      return otherMember ? `User ${otherMember.account_id}` : 'Unknown User';
    }
    return 'Group Chat';
  };

  const getAvatar = (inbox: Inbox): string => {
    const name = getConversationName(inbox);
    const bgColor = inbox.conversation_type === 'direct' ? '6366f1' : '10b981';
    return `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=${bgColor}&color=fff&bold=true`;
  };

  const getSenderAvatar = (message: Message): string => {
    const isSender = checkMessageSender(message);
    const name = isSender ? 'You' : 'Other';
    const bgColor = isSender ? '6366f1' : '8b5cf6';
    return `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=${bgColor}&color=fff&bold=true`;
  };

  const formatTime = (dateString?: string | Date): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (dateString?: string | Date): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Filter conversations based on search
  const filteredConversations = inboxList.filter((inbox) =>
    getConversationName(inbox).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render message bubble
  const renderMessageBubble = (message: Message) => {
    const isSender = checkMessageSender(message);
    const isImage = message.message_type === 'image';
    const hasAttachment = message.attachments && message.attachments.length > 0;
    const hasReaction = message.message_react && message.message_react.length > 0;
    const isRead = message.read_by && message.read_by.length > 0;

    return (
      <div
        key={message._id}
        className={`flex gap-3 ${isSender ? 'flex-row-reverse' : ''}`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={getSenderAvatar(message)}
            alt="avatar"
            className="h-8 w-8 rounded-full object-cover"
          />
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isSender ? 'items-end' : 'items-start'} max-w-[70%]`}>
          <div
            className={`rounded-2xl px-4 py-2.5 ${
              isSender
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                : 'bg-white/10 text-white'
            }`}
          >
            {/* Image Attachment */}
            {isImage && hasAttachment && (
              <div className="mb-2">
                <img
                  src={message.attachments[0].attachment_url}
                  alt="attachment"
                  className="rounded-lg max-w-[300px] max-h-[200px] object-cover"
                />
              </div>
            )}

            {/* File Attachment */}
            {!isImage && hasAttachment && (
              <div className="mb-2 flex items-center gap-2 bg-white/10 rounded-lg p-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm truncate max-w-[150px]">
                  {message.attachments[0].attachment_url.split('/').pop() || 'file'}
                </span>
              </div>
            )}

            {/* Message Text */}
            {message.message_content && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.message_content}
              </p>
            )}

            {/* Reactions */}
            {hasReaction && (
              <div className="mt-1 flex gap-1">
                {message.message_react.map((react, index) => (
                  <span
                    key={index}
                    className="text-sm bg-white/20 rounded-full px-1.5 py-0.5"
                  >
                    {react.react_type}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Message Metadata */}
          <div className={`flex items-center gap-2 mt-1 text-xs text-zinc-500 ${isSender ? 'flex-row-reverse' : ''}`}>
            <span>{formatMessageTime(message.created_at)}</span>
            {isSender && (
              <span className="flex items-center gap-0.5">
                {isRead ? (
                  <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5 text-zinc-500" />
                )}
              </span>
            )}
            {message.is_edited && (
              <span className="text-[10px]">(edited)</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach(message => {
      const date = new Date(message.created_at);
      const dateKey = date.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    return groups;
  };

  const getDateLabel = (dateKey: string) => {
    const date = new Date(dateKey);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  // Use sample messages if no messages exist
  const displayMessages = messages.length > 0 ? messages : [];
  const groupedMessages = groupMessagesByDate(displayMessages);

  return (
    <div className="min-h-screen bg-[#080a12] overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0d0f1a]/95 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-blue-400" />
            Messages
          </h1>
          <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
            <UserPlus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl h-[calc(100vh-73px)] overflow-hidden">
        <div className="flex h-full overflow-hidden">
          {/* Chat List Sidebar */}
          <div className="hidden md:flex w-80 flex-col border-r border-white/10 bg-[#0d0f1a] overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/10 flex-shrink-0">
              <button
                onClick={() => setActiveTab("direct")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
                  activeTab === "direct"
                    ? "text-white border-b-2 border-blue-500"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Users className="h-4 w-4" />
                Direct Messages
              </button>
              <button
                onClick={() => setActiveTab("engagement")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
                  activeTab === "engagement"
                    ? "text-white border-b-2 border-blue-500"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Engagements
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "direct" 
                      ? "Search conversations..." 
                      : "Search engagements..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <MessageCircle className="h-12 w-12 text-zinc-600 mb-3" />
                  <p className="text-zinc-400">
                    {searchQuery ? 'No conversations found' : 'No messages yet'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((inbox) => {
                  const isActive = selectedConversation?._id === inbox._id;
                  const name = getConversationName(inbox);
                  const avatar = getAvatar(inbox);
                  const lastMessage = inbox.last_message || 'No messages yet';
                  const time = formatTime(inbox.last_message_time || inbox.updated_at);
                  const unreadCount = inbox.unread_count || 0;

                  return (
                    <button
                      key={inbox._id}
                      onClick={() => setSelectedConversation(inbox)}
                      className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all duration-200 ${
                        isActive ? 'bg-gradient-to-r from-blue-500/20 to-transparent border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={avatar}
                          alt={name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                        {inbox.conversation_type === 'direct' && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-[#0d0f1a]"></span>
                        )}
                      </div>
                      
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-white truncate">{name}</p>
                        <p className="text-xs text-zinc-500 truncate">{lastMessage}</p>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-zinc-500">{time}</p>
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-500 text-[10px] font-medium text-white px-1">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gradient-to-b from-[#0d0f1a] to-[#080a12] overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="sticky top-0 z-10 bg-[#0d0f1a]/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <img
                      src={getAvatar(selectedConversation)}
                      alt={getConversationName(selectedConversation)}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <h2 className="font-semibold text-white">
                        {getConversationName(selectedConversation)}
                      </h2>
                      <p className="text-xs text-zinc-500">
                        {selectedConversation.conversation_type === 'direct' 
                          ? 'Active now' 
                          : `${selectedConversation.members.length} members`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                      <Share2 className="h-5 w-5" />
                    </button>
                    <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                      <Video className="h-5 w-5" />
                    </button>
                    <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messageLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
                        <div key={dateKey}>
                          {/* Date Divider */}
                          <div className="flex justify-center my-4">
                            <span className="text-xs text-zinc-500 bg-[#0d0f1a] px-3 py-1 rounded-full border border-white/10">
                              {getDateLabel(dateKey)}
                            </span>
                          </div>

                          {/* Messages */}
                          <div className="space-y-3">
                            {dateMessages.map((message) => renderMessageBubble(message))}
                          </div>
                        </div>
                      ))}
                      
                      {/* Scroll anchor */}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t border-white/10 bg-[#0d0f1a] p-4 flex-shrink-0">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 pr-12 text-sm text-white outline-none resize-none placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <button className="absolute right-2 bottom-1.5 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                        <Image className="h-4 w-4" />
                      </button>
                    </div>
                    <button className="rounded-xl p-2.5 text-zinc-400 hover:bg-white/10 hover:text-white transition">
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-2.5 text-white transition hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!messageInput.trim()}
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="text-center">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                    <MessageCircle className="h-12 w-12 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {activeTab === 'direct' ? 'Direct Messages' : 'Engagements'}
                  </h3>
                  <p className="text-zinc-400 max-w-sm">
                    {inboxList.length === 0 
                      ? 'No conversations found. Start a new chat!' 
                      : 'Select a conversation from the sidebar to start messaging'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;