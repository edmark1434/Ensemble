// src/pages/user/inbox/Inbox.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import useGlobalState from "@/lib/global_state";
import {
  MessageCircle,
  Send,
  Paperclip,
  Video,
  Phone,
  MoreVertical,
  Search,
  Users,
  UserPlus,
  X,
  Image as ImageIcon,
  Smile,
  Check,
  CheckCheck,
  Clock,
  ZoomIn,
  Calendar,
  PhoneCall,
  Video as VideoIcon,
  ArrowLeft,
  Trash2,
  Pin,
  Reply,
  Copy,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Monitor,
  Users as UsersIcon,
  Settings,
  LogOut,
  ChevronDown,
  PlusCircle,
  AtSign,
  Link2,
  FileText,
  MapPin,
  Gift,
  Bold,
  Italic,
  Underline,
  List,
  Code,
  Quote,
  MinusCircle,
  Maximize2,
  Minimize2
} from "lucide-react";

// ============= Types =============

type Reaction = {
  account_id: number;
  reaction: string;
  created_at: string;
};

type Attachment = {
  file_path: string;
  type: 'image' | 'video' | 'document' | 'audio';
  name: string;
  size: number;
};

type Message = {
  _id?: string;
  account_id: number;
  message: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  attachments: Attachment[];
  reactions: Reaction[];
};

type Member = {
  user_id: number;
  role: 'admin' | 'member' | 'moderator';
  status: 'active' | 'left' | 'removed' | 'invited';
  joined_at: string;
  deleted_at: string | null;
};

type Chat = {
  _id: number;
  name: string | null;
  type: 'direct' | 'group' | 'channel';
  created_at: string;
  last_message_at: string;
  deleted_at: string | null;
  members: Member[];
  messages: Message[];
};

type VideoCallProvider = 'zoom' | 'google_meet';

// ============= Helper Functions =============

const formatTime = (dateString: string): string => {
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

const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// ============= Sub-components =============

const MessageBubble = ({ 
  message, 
  isOwn, 
  isSystem,
  onReply,
  onCopy,
  onPin,
  onDelete,
  onReact
}: { 
  message: Message; 
  isOwn: boolean;
  isSystem: boolean;
  onReply?: () => void;
  onCopy?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onReact?: (reaction: string) => void;
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  
  const reactionsList = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-white/5 rounded-full px-4 py-1.5">
          <span className="text-xs text-zinc-400">{message.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isOwn && (
        <img
          src={`https://i.pravatar.cc/150?u=${message.account_id}`}
          alt="Avatar"
          className="h-8 w-8 rounded-full mr-2 flex-shrink-0 mt-1"
        />
      )}
      
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`relative rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-blue-500 text-white rounded-br-sm'
              : 'bg-white/10 text-white rounded-bl-sm'
          }`}
        >
          <p className="text-sm break-words whitespace-pre-wrap">{message.message}</p>
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs underline opacity-80 hover:opacity-100"
                >
                  <Paperclip className="h-3 w-3" />
                  {att.name || 'Attachment'}
                </a>
              ))}
            </div>
          )}
          
          {/* Message Actions */}
          {showActions && !message.deleted_at && (
            <div className={`absolute -top-8 ${isOwn ? 'right-0' : 'left-0'} flex gap-1 bg-[#1a1d2e] rounded-lg shadow-lg p-1 z-10`}>
              <button
                onClick={() => onReact && setShowReactions(!showReactions)}
                className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition"
                title="React"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onReply}
                className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition"
                title="Reply"
              >
                <Reply className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onCopy}
                className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition"
                title="Copy"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {isOwn && (
                <button
                  onClick={onDelete}
                  className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          
          {/* Reaction Picker */}
          {showReactions && (
            <div className="absolute -top-10 left-0 flex gap-1 bg-[#1a1d2e] rounded-full shadow-lg p-1.5 z-20">
              {reactionsList.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact && onReact(emoji);
                    setShowReactions(false);
                  }}
                  className="p-1 rounded-full hover:bg-white/10 transition text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Reactions Display */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 mt-1">
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.reaction] = (acc[r.reaction] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([reaction, count]) => (
              <span key={reaction} className="text-xs bg-white/10 rounded-full px-1.5 py-0.5">
                {reaction} {count}
              </span>
            ))}
          </div>
        )}
        
        <span className={`text-[10px] text-zinc-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {formatMessageTime(message.created_at)}
          {isOwn && (
            <span className="ml-1">
              {message.updated_at !== message.created_at ? (
                <span className="text-zinc-600">edited</span>
              ) : (
                <CheckCheck className="h-3 w-3 inline" />
              )}
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

const ChatListItem = ({ 
  chat, 
  isActive, 
  onClick,
  currentUserId 
}: { 
  chat: Chat; 
  isActive: boolean; 
  onClick: () => void;
  currentUserId: number;
}) => {
  const getChatName = () => {
    if (chat.name) return chat.name;
    if (chat.type === 'direct') {
      const otherMember = chat.members.find(m => m.user_id !== currentUserId);
      return otherMember ? `User ${otherMember.user_id}` : 'Unknown';
    }
    return 'Group Chat';
  };
  
  const getAvatar = () => {
    if (chat.type === 'group') {
      const name = getChatName();
      return `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=6366f1&color=fff&bold=true`;
    }
    const otherMember = chat.members.find(m => m.user_id !== currentUserId);
    return `https://i.pravatar.cc/150?u=${otherMember?.user_id || currentUserId}`;
  };
  
  const lastMessage = chat.messages[chat.messages.length - 1];
  const unreadCount = 0; // You can implement unread logic
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all duration-200 ${
        isActive ? 'bg-gradient-to-r from-blue-500/20 to-transparent border-l-2 border-blue-500' : ''
      }`}
    >
      <div className="relative">
        <img
          src={getAvatar()}
          alt={getChatName()}
          className="h-12 w-12 rounded-full object-cover"
        />
        {chat.type === 'direct' && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-[#0d0f1a]"></span>
        )}
      </div>
      
      <div className="flex-1 text-left min-w-0">
        <p className="font-medium text-white truncate">{getChatName()}</p>
        <p className="text-xs text-zinc-500 truncate">
          {lastMessage?.message || 'No messages yet'}
        </p>
      </div>
      
      <div className="text-right flex-shrink-0">
        {lastMessage && (
          <p className="text-[10px] text-zinc-500">
            {formatTime(lastMessage.created_at)}
          </p>
        )}
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-blue-500 text-[10px] font-medium text-white px-1">
            {unreadCount}
          </span>
        )}
      </div>
    </button>
  );
};

const VideoCallModal = ({ 
  isOpen, 
  onClose, 
  onStart,
  chatName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onStart: (provider: VideoCallProvider, topic: string, duration: number) => void;
  chatName: string;
}) => {
  const [provider, setProvider] = useState<VideoCallProvider>('google_meet');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(60);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Video className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Start Video Call</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Call Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setProvider('google_meet')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                  provider === 'google_meet'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/20'
                    : 'border-white/15 text-zinc-400 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <VideoIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Google Meet</span>
              </button>
              <button
                onClick={() => setProvider('zoom')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                  provider === 'zoom'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/20'
                    : 'border-white/15 text-zinc-400 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <ZoomIn className="h-5 w-5" />
                <span className="text-sm font-medium">Zoom</span>
              </button>
            </div>
          </div>

          {/* Call Topic */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Call Topic (Optional)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`${provider === 'zoom' ? 'Zoom' : 'Google Meet'} Meeting with ${chatName}`}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* Duration - Only for Zoom */}
          {provider === 'zoom' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Duration (minutes)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
                <option value="180">3 hours</option>
              </select>
            </div>
          )}

          {/* Info Note */}
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs text-zinc-400">
              {provider === 'zoom' 
                ? '🔵 Zoom: Free tier supports up to 100 participants with a 40-minute limit for group calls.'
                : '🟢 Google Meet: Free, unlimited calls with up to 100 participants.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={() => onStart(provider, topic, duration)}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25"
            >
              <div className="flex items-center justify-center gap-2">
                <Video className="h-4 w-4" />
                Start Call
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============= Main Component =============

const Inbox = () => {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const user = useGlobalState((state) => state.user);
  const currentUserId = user?.userId || 1;

  // Fetch chats on mount
  useEffect(() => {
    fetchChats();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [messageInput]);

  const fetchChats = async () => {
    try {
      const response = await api.get('api/chats');
      setChats(response.data.chats || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chats:', error);
      showErrorToast('Failed to load messages');
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || sending) return;

    setSending(true);
    try {
      const response = await api.post(`api/chats/${selectedChat._id}/messages`, {
        message: messageInput,
        is_private: false
      });

      if (response.data.success) {
        setMessageInput("");
        await fetchChats();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showErrorToast('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const startVideoCall = async (provider: VideoCallProvider, topic: string, duration: number) => {
    if (!selectedChat) return;

    try {
      const response = await api.post('api/chats/start-video-call', {
        chatId: selectedChat._id,
        provider,
        topic: topic || `Meeting with ${getChatName(selectedChat)}`,
        duration
      });

      if (response.data.success) {
        window.open(response.data.callData.joinUrl, '_blank');
        setShowVideoModal(false);
        showSuccessToast(`${provider === 'zoom' ? 'Zoom' : 'Google Meet'} call started!`);
        await fetchChats();
      }
    } catch (error) {
      console.error('Error starting video call:', error);
      showErrorToast('Failed to start video call');
    }
  };

  const getChatName = (chat: Chat): string => {
    if (chat.name) return chat.name;
    if (chat.type === 'direct') {
      const otherMember = chat.members.find(m => m.user_id !== currentUserId);
      return otherMember ? `User ${otherMember.user_id}` : 'Unknown User';
    }
    return 'Group Chat';
  };

  const getChatAvatar = (chat: Chat): string => {
    if (chat.type === 'group') {
      const name = getChatName(chat);
      return `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=6366f1&color=fff&bold=true`;
    }
    const otherMember = chat.members.find(m => m.user_id !== currentUserId);
    return `https://i.pravatar.cc/150?u=${otherMember?.user_id || currentUserId}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredChats = chats.filter(chat => 
    getChatName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12]">
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

      <div className="mx-auto max-w-7xl h-[calc(100vh-73px)]">
        <div className="flex h-full">
          {/* Chat List Sidebar - Hidden on mobile when chat selected */}
          <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-white/10 bg-[#0d0f1a]`}>
            {/* Search Bar */}
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <MessageCircle className="h-12 w-12 text-zinc-600 mb-3" />
                  <p className="text-zinc-400">No conversations yet</p>
                  <p className="text-xs text-zinc-500 mt-1">Start a new chat to begin messaging</p>
                </div>
              ) : (
                filteredChats.map(chat => (
                  <ChatListItem
                    key={chat._id}
                    chat={chat}
                    isActive={selectedChat?._id === chat._id}
                    onClick={() => setSelectedChat(chat)}
                    currentUserId={currentUserId}
                  />
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedChat ? (
            <div className="flex-1 flex flex-col bg-gradient-to-b from-[#0d0f1a] to-[#080a12]">
              {/* Chat Header */}
              <div className="sticky top-0 z-10 bg-[#0d0f1a]/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden rounded-lg p-1 text-zinc-400 hover:bg-white/10"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <img
                    src={getChatAvatar(selectedChat)}
                    alt={getChatName(selectedChat)}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <h2 className="font-semibold text-white">{getChatName(selectedChat)}</h2>
                    <p className="text-xs text-zinc-500">
                      {selectedChat.type === 'group' 
                        ? `${selectedChat.members.length} members` 
                        : 'Active now'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowVideoModal(true)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                    title="Start Video Call"
                  >
                    <Video className="h-5 w-5" />
                  </button>
                  <button
                    className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                    title="Voice Call"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                  <button
                    className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                    title="More Options"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedChat.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                      <MessageCircle className="h-10 w-10 text-blue-400" />
                    </div>
                    <p className="text-zinc-400">No messages yet</p>
                    <p className="text-sm text-zinc-500 mt-1">Send a message to start the conversation</p>
                  </div>
                ) : (
                  selectedChat.messages.map((message, idx) => (
                    <MessageBubble
                      key={message._id || idx}
                      message={message}
                      isOwn={message.account_id === currentUserId}
                      isSystem={message.account_id === 0}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-white/10 bg-[#0d0f1a] p-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 pr-12 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition placeholder:text-zinc-500"
                    />
                    <button
                      className="absolute right-2 bottom-1.5 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => {}} // Attachment picker
                    className="rounded-xl p-2.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!messageInput.trim() || sending}
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-2.5 text-white transition hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                  >
                    {sending ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // No Chat Selected - Desktop View
            <div className="hidden md:flex flex-1 flex-col items-center justify-center">
              <div className="text-center">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="h-12 w-12 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Your Messages</h3>
                <p className="text-zinc-400 max-w-sm">
                  Select a conversation from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onStart={startVideoCall}
        chatName={selectedChat ? getChatName(selectedChat) : ''}
      />
    </div>
  );
};

export default Inbox;