// src/pages/user/inbox/Inbox.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import useGlobalState from "@/lib/global_state";
import socket from "@/lib/socket";
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
  Minimize2,
  Share2,
  Link as LinkIcon,
  CheckCircle,
  MoreHorizontal
} from "lucide-react";

// ============= Types =============

type Member = {
  account_id: string;
  role: 'owner' | 'admin' | 'member' | 'moderator';
  joined_at: string;
};

type PinnedMessage = {
  message_id: string;
  pinned_by: string;
  pinned_at: string;
};

type Conversation = {
  _id: string;
  conversation_name: string | null;
  conversation_type: 'direct' | 'group' | 'channel';
  members: Member[];
  pinned_messages: PinnedMessage[];
  created_at: string;
  updated_at: string;
  messages?: Message[];
};

type Attachment = {
  attachment_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  url: string;
  thumbnail_url: string | null;
};

type Link = {
  url: string;
  title: string;
  description: string;
  preview_image: string;
};

type MessageReact = {
  emoji: string;
  users: string[];
};

type ReadBy = {
  account_id: string;
  read_at: string;
};

type Message = {
  _id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';
  message_content: string;
  message_id_reply: string | null;
  attachments: Attachment[];
  links: Link[];
  message_react: MessageReact[];
  read_by: ReadBy[];
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type VideoCallProvider = 'google_meet';

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
  isPinned,
  onReply,
  onCopy,
  onPin,
  onDelete,
  onReact
}: { 
  message: Message; 
  isOwn: boolean;
  isSystem: boolean;
  isPinned: boolean;
  onReply?: () => void;
  onCopy?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onReact?: (reaction: string) => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  
  const reactionsList = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  const menuRef = useRef<HTMLDivElement>(null);
  const reactionRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (reactionRef.current && !reactionRef.current.contains(event.target as Node)) {
        setShowReactions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-white/5 rounded-full px-4 py-1.5">
          <span className="text-xs text-zinc-400">{message.message_content}</span>
        </div>
      </div>
    );
  }

  const getReactionCounts = () => {
    const counts: Record<string, number> = {};
    if (message.message_react) {
      message.message_react.forEach(react => {
        counts[react.emoji] = react.users.length;
      });
    }
    return counts;
  };

  const handleReactionClick = (emoji: string) => {
    if (onReact) {
      onReact(emoji);
      setSelectedEmoji(emoji);
      setTimeout(() => setSelectedEmoji(null), 1000);
    }
    setShowReactions(false);
  };

  const toggleMenu = () => {
    setShowMenu(!showMenu);
    setShowReactions(false);
  };

  const toggleReactions = () => {
    setShowReactions(!showReactions);
    setShowMenu(false);
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative w-full`}>
      {!isOwn && (
        <img
          src={`https://i.pravatar.cc/150?u=${message.sender_id}`}
          alt="Avatar"
          className="h-8 w-8 rounded-full mr-2 flex-shrink-0 mt-1"
        />
      )}
      
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col relative`}>
        <div className="relative w-full">
          {/* Three Dots Menu Button - Left side */}
          {!message.is_deleted && (
            <button
              onClick={toggleMenu}
              className={`absolute -left-8 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition ${
                showMenu ? 'bg-white/10' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <MoreHorizontal className="h-4 w-4 text-zinc-400" />
            </button>
          )}

          <div
            className={`relative rounded-2xl px-4 py-2 ${
              isOwn
                ? 'bg-blue-500 text-white rounded-br-sm'
                : 'bg-white/10 text-white rounded-bl-sm'
            }`}
          >
            {/* Pin Icon */}
            {isPinned && (
              <div className="absolute -top-2 -right-2">
                <Pin className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              </div>
            )}
            
            <p className="text-sm break-words whitespace-pre-wrap">{message.message_content}</p>
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {message.attachments.map((att) => (
                  <a
                    key={att.attachment_id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs underline opacity-80 hover:opacity-100"
                  >
                    <Paperclip className="h-3 w-3" />
                    {att.file_name}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown Menu */}
          {showMenu && (
            <div 
              ref={menuRef}
              className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 bg-[#1a1d2e] rounded-lg shadow-lg p-1 z-20 border border-white/10 min-w-[160px]`}
            >
              <button
                onClick={() => {
                  toggleReactions();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-zinc-300 hover:text-white transition text-sm"
              >
                <Smile className="h-4 w-4" />
                React
              </button>
              <button
                onClick={() => {
                  if (onReply) onReply();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-zinc-300 hover:text-white transition text-sm"
              >
                <Reply className="h-4 w-4" />
                Reply
              </button>
              <button
                onClick={() => {
                  if (onCopy) onCopy();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-zinc-300 hover:text-white transition text-sm"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <button
                onClick={() => {
                  if (onPin) onPin();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 text-zinc-300 hover:text-white transition text-sm"
              >
                <Pin className="h-4 w-4" />
                {isPinned ? 'Unpin' : 'Pin'}
              </button>
              {isOwn && (
                <button
                  onClick={() => {
                    if (onDelete) onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-red-500/20 text-red-400 transition text-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Reaction Picker */}
          {showReactions && (
            <div 
              ref={reactionRef}
              className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-14 flex gap-1 bg-[#1a1d2e] rounded-full shadow-lg p-1.5 z-30 border border-white/10`}
            >
              {reactionsList.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className={`p-1 rounded-full hover:bg-white/10 transition text-lg ${
                    selectedEmoji === emoji ? 'scale-125 bg-blue-500/20' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Reactions Display */}
        {message.message_react && message.message_react.length > 0 && (
          <div className="flex gap-1 mt-1 ml-1">
            {Object.entries(getReactionCounts()).map(([reaction, count]) => (
              <span key={reaction} className="text-xs bg-white/10 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                <span>{reaction}</span>
                <span className="text-[10px] text-zinc-400">{count}</span>
              </span>
            ))}
          </div>
        )}
        
        <span className={`text-[10px] text-zinc-500 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {formatMessageTime(message.created_at)}
          {isOwn && (
            <span className="ml-1">
              {message.is_edited ? (
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
  conversation, 
  isActive, 
  onClick,
  currentUserId,
  lastMessage
}: { 
  conversation: Conversation; 
  isActive: boolean; 
  onClick: () => void;
  currentUserId: string;
  lastMessage?: Message | null;
}) => {
  const getChatName = () => {
    if (conversation.conversation_name) return conversation.conversation_name;
    if (conversation.conversation_type === 'direct') {
      const otherMember = conversation.members.find(m => m.account_id !== currentUserId);
      return otherMember ? `User ${otherMember.account_id}` : 'Unknown';
    }
    return 'Group Chat';
  };
  
  const getAvatar = () => {
    if (conversation.conversation_type === 'group') {
      const name = getChatName();
      return `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=6366f1&color=fff&bold=true`;
    }
    const otherMember = conversation.members.find(m => m.account_id !== currentUserId);
    return `https://i.pravatar.cc/150?u=${otherMember?.account_id || currentUserId}`;
  };
  
  const lastMessageText = lastMessage?.message_content || 'No messages yet';
  const unreadCount = 0;
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-all duration-200 ${
        isActive ? 'bg-gradient-to-r from-blue-500/20 to-transparent border-l-2 border-blue-500' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        <img
          src={getAvatar()}
          alt={getChatName()}
          className="h-12 w-12 rounded-full object-cover"
        />
        {conversation.conversation_type === 'direct' && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-[#0d0f1a]"></span>
        )}
      </div>
      
      <div className="flex-1 text-left min-w-0">
        <p className="font-medium text-white truncate">{getChatName()}</p>
        <p className="text-xs text-zinc-500 truncate">
          {lastMessageText}
        </p>
      </div>
      
      <div className="text-right flex-shrink-0">
        {conversation.updated_at && (
          <p className="text-[10px] text-zinc-500">
            {formatTime(conversation.updated_at)}
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
  onStart: (provider: VideoCallProvider, topic: string) => void;
  chatName: string;
}) => {
  const [topic, setTopic] = useState('');

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
          {/* Call Topic */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Call Topic (Optional)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`Google Meet Meeting with ${chatName}`}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          {/* Info Note */}
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs text-zinc-400">
              🟢 Google Meet: Free, unlimited calls with up to 100 participants.
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
              onClick={() => onStart('google_meet', topic)}
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

// ============= Share Group Modal =============

const ShareGroupModal = ({ 
  isOpen, 
  onClose, 
  conversationId,
  conversationName,
  inviteLink
}: { 
  isOpen: boolean; 
  onClose: () => void;
  conversationId: string;
  conversationName: string;
  inviteLink: string;
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      showSuccessToast('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      showErrorToast('Failed to copy link');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${conversationName} on Chat App`,
          text: `Join our group chat "${conversationName}"!`,
          url: inviteLink,
        });
      } else {
        await handleCopyLink();
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Share Group</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-sm text-zinc-300">
              Share this invite link with others to join <span className="text-white font-semibold">{conversationName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/5 rounded-xl border border-white/10 p-3">
            <LinkIcon className="h-5 w-5 text-zinc-400 flex-shrink-0" />
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 bg-transparent text-sm text-zinc-300 outline-none cursor-default"
            />
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition flex-shrink-0"
              title="Copy link"
            >
              {copied ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
            >
              <Copy className="h-4 w-4" />
              Copy Link
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 text-sm font-medium text-white transition hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/25"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="h-24 w-24 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg flex items-center justify-center mb-2">
              <Users className="h-10 w-10 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-500">Scan QR code to join (Coming soon)</p>
          </div>

          <p className="text-xs text-zinc-500 text-center">
            Anyone with this link can join the group
          </p>
        </div>
      </div>
    </div>
  );
};

// ============= Create Conversation Modal =============

const CreateConversationModal = ({ 
  isOpen, 
  onClose,
  onCreate
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onCreate: (type: 'direct' | 'group', name: string, memberIds: string[]) => void;
}) => {
  const [type, setType] = useState<'direct' | 'group'>('direct');
  const [name, setName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [newMemberId, setNewMemberId] = useState('');

  if (!isOpen) return null;

  const handleAddMember = () => {
    if (newMemberId.trim() && !memberIds.includes(newMemberId.trim())) {
      setMemberIds([...memberIds, newMemberId.trim()]);
      setNewMemberId('');
    }
  };

  const handleRemoveMember = (id: string) => {
    setMemberIds(memberIds.filter(m => m !== id));
  };

  const handleSubmit = () => {
    if (type === 'direct' && memberIds.length === 0) {
      showErrorToast('Please add at least one member');
      return;
    }
    if (type === 'group' && !name.trim()) {
      showErrorToast('Please enter a group name');
      return;
    }
    onCreate(type, name, memberIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">New Conversation</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Conversation Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Conversation Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setType('direct')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                  type === 'direct'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/20'
                    : 'border-white/15 text-zinc-400 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">Direct</span>
              </button>
              <button
                onClick={() => setType('group')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                  type === 'group'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/20'
                    : 'border-white/15 text-zinc-400 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <UsersIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Group</span>
              </button>
            </div>
          </div>

          {/* Group Name - Only for groups */}
          {type === 'group' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name..."
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          )}

          {/* Add Members */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Members
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMemberId}
                onChange={(e) => setNewMemberId(e.target.value)}
                placeholder="Enter user ID..."
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
              />
              <button
                onClick={handleAddMember}
                className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 transition"
              >
                Add
              </button>
            </div>

            {/* Member Tags */}
            {memberIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {memberIds.map((id) => (
                  <span
                    key={id}
                    className="flex items-center gap-1 bg-blue-500/20 text-blue-300 rounded-full px-3 py-1 text-xs"
                  >
                    User {id}
                    <button
                      onClick={() => handleRemoveMember(id)}
                      className="hover:text-red-400 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25"
            >
              <div className="flex items-center justify-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Create
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const user = useGlobalState((state) => state.user);
  const currentUserId = user?.user_id?.toString() || "14";

  // Fetch conversations on mount
  useEffect(() => {
    socket.connect();
    fetchConversations();
  }, []);

  // Set messages when conversation is selected
  useEffect(() => {
    if (selectedConversation && selectedConversation.messages) {
      setMessages(selectedConversation.messages);
      // Load pinned messages from conversation
      if (selectedConversation.pinned_messages) {
        const pinnedIds = new Set(selectedConversation.pinned_messages.map(p => p.message_id));
        setPinnedMessages(pinnedIds);
      }
    }
  }, [selectedConversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [messageInput]);

  const fetchConversations = async () => {
    try {
      const response = await api.get('api/inbox/conversations');
      const conversationsData = response.data;
      
      conversationsData.forEach((conv: Conversation, index: number) => {
        console.log(`📥 Conversation ${index + 1}:`, {
          id: conv._id,
          name: conv.conversation_name,
          type: conv.conversation_type,
          members: conv.members.length,
          messages: conv.messages?.length || 0
        });
      });
      
      setConversations(conversationsData);
      
      if (conversationsData.length > 0 && !selectedConversation) {
        setSelectedConversation(conversationsData[0]);
        if (conversationsData[0].messages) {
          setMessages(conversationsData[0].messages);
        }
        if (conversationsData[0].pinned_messages) {
          const pinnedIds = new Set(conversationsData[0].pinned_messages.map(p => p.message_id));
          setPinnedMessages(pinnedIds);
        }
      }
      
      setLoading(false);
    } catch (error: any) {
      console.error('❌ Error fetching conversations:', error);
      showErrorToast('Failed to load conversations');
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const getChatName = (conversation: Conversation): string => {
    if (conversation.conversation_name) return conversation.conversation_name;
    if (conversation.conversation_type === 'direct') {
      const otherMember = conversation.members.find(m => m.account_id !== currentUserId);
      return otherMember ? `User ${otherMember.account_id}` : 'Unknown User';
    }
    return 'Group Chat';
  };

  const getChatAvatar = (conversation: Conversation): string => {
    if (conversation.conversation_type === 'group') {
      const name = getChatName(conversation);
      return `https://ui-avatars.com/api/?name=${name.substring(0, 2)}&background=6366f1&color=fff&bold=true`;
    }
    const otherMember = conversation.members.find(m => m.account_id !== currentUserId);
    return `https://i.pravatar.cc/150?u=${otherMember?.account_id || currentUserId}`;
  };

  const getLastMessage = (conversation: Conversation): Message | null => {
    if (conversation.messages && conversation.messages.length > 0) {
      return conversation.messages[conversation.messages.length - 1];
    }
    return null;
  };

  // ============= Message Functions =============
  
  const sendMessage = () => {
    if (!messageInput.trim() || !selectedConversation || sending) return;

    setSending(true);
    
    console.log('📤 [UI ONLY] Sending Message:');
    console.log('📤 Message content:', messageInput.trim());
    console.log('📤 Conversation ID:', selectedConversation._id);
    console.log('📤 Replying to:', replyingTo?._id || 'None');
    
    const tempMessage: Message = {
      _id: `temp_${Date.now()}`,
      conversation_id: selectedConversation._id,
      sender_id: currentUserId,
      message_type: 'text',
      message_content: messageInput.trim(),
      message_id_reply: replyingTo?._id || null,
      attachments: [],
      links: [],
      message_react: [],
      read_by: [],
      is_edited: false,
      edited_at: null,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, tempMessage]);
    setMessageInput("");
    setReplyingTo(null);
    
    showSuccessToast('Message sent (UI only)');
    
    setTimeout(() => {
      setSending(false);
      scrollToBottom();
    }, 500);
  };

  const createConversation = (type: 'direct' | 'group', name: string, memberIds: string[]) => {
    console.log('📤 [UI ONLY] Creating conversation:');
    console.log('📤 Type:', type);
    console.log('📤 Name:', name);
    console.log('📤 Members:', memberIds);
    
    // Create a temporary conversation
    const tempConversation: Conversation = {
      _id: `temp_conv_${Date.now()}`,
      conversation_name: type === 'group' ? name : null,
      conversation_type: type,
      members: [
        { account_id: currentUserId, role: 'owner', joined_at: new Date().toISOString() },
        ...memberIds.map(id => ({ account_id: id, role: 'member', joined_at: new Date().toISOString() }))
      ],
      pinned_messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: []
    };
    
    setConversations(prev => [tempConversation, ...prev]);
    setSelectedConversation(tempConversation);
    setMessages([]);
    
    showSuccessToast(`Conversation created (UI only)`);
  };

  const searchConversations = (query: string) => {
    if (!query.trim()) {
      fetchConversations();
      return;
    }

    console.log('🔍 [UI ONLY] Searching conversations with query:', query);
    
    const filtered = conversations.filter(conv => {
      const name = conv.conversation_name || '';
      return name.toLowerCase().includes(query.toLowerCase());
    });
    
    setConversations(filtered);
    showSuccessToast(`Found ${filtered.length} conversations (UI search)`);
  };

  // ============= Message Actions =============
  
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    showSuccessToast('Copied to clipboard');
  };

  const deleteMessage = (messageId: string) => {
    console.log('🗑️ [UI ONLY] Deleting message:', messageId);
    setMessages(prev => prev.filter(m => m._id !== messageId));
    // Remove from pinned if pinned
    setPinnedMessages(prev => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
    showSuccessToast('Message deleted (UI only)');
  };

  const reactToMessage = (messageId: string, emoji: string) => {
    console.log('📤 [UI ONLY] Reacting to message:', messageId, 'with', emoji);
    
    setMessages(prev => prev.map(msg => {
      if (msg._id === messageId) {
        const existingReact = msg.message_react.find(r => r.emoji === emoji);
        if (existingReact) {
          // Remove user from reaction
          existingReact.users = existingReact.users.filter(id => id !== currentUserId);
          if (existingReact.users.length === 0) {
            return {
              ...msg,
              message_react: msg.message_react.filter(r => r.emoji !== emoji)
            };
          }
        } else {
          // Add new reaction
          return {
            ...msg,
            message_react: [...msg.message_react, { emoji, users: [currentUserId] }]
          };
        }
      }
      return msg;
    }));
    
    showSuccessToast(`Reacted with ${emoji} (UI only)`);
  };

  const pinMessage = (messageId: string) => {
    console.log('📌 [UI ONLY] Toggling pin for message:', messageId);
    
    setPinnedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
        showSuccessToast('Message unpinned (UI only)');
      } else {
        newSet.add(messageId);
        showSuccessToast('Message pinned (UI only)');
      }
      return newSet;
    });
  };

  // ============= Other Functions =============

  const generateInviteLink = (conversationId: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/join-group/${conversationId}`;
    setInviteLink(link);
    return link;
  };

  const handleShareGroup = () => {
    if (selectedConversation) {
      generateInviteLink(selectedConversation._id);
      setShowShareModal(true);
    }
  };

  const startVideoCall = async (provider: VideoCallProvider, topic: string) => {
    console.log('📤 [UI ONLY] Video call:', { provider, topic });
    showErrorToast('Video call feature coming soon');
    setShowVideoModal(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchConversations(query);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

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
          <button 
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <UserPlus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl h-[calc(100vh-73px)] overflow-hidden">
        <div className="flex h-full overflow-hidden">
          {/* Chat List Sidebar */}
          <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-white/10 bg-[#0d0f1a] overflow-hidden`}>
            {/* Search Bar */}
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <MessageCircle className="h-12 w-12 text-zinc-600 mb-3" />
                  <p className="text-zinc-400">No conversations yet</p>
                  <p className="text-xs text-zinc-500 mt-1">Start a new chat to begin messaging</p>
                </div>
              ) : (
                conversations.map(conversation => {
                  const lastMsg = getLastMessage(conversation);
                  return (
                    <ChatListItem
                      key={conversation._id}
                      conversation={conversation}
                      isActive={selectedConversation?._id === conversation._id}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        if (conversation.messages) {
                          setMessages(conversation.messages);
                        }
                        if (conversation.pinned_messages) {
                          const pinnedIds = new Set(conversation.pinned_messages.map(p => p.message_id));
                          setPinnedMessages(pinnedIds);
                        }
                      }}
                      currentUserId={currentUserId}
                      lastMessage={lastMsg}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedConversation ? (
            <div className="flex-1 flex flex-col bg-gradient-to-b from-[#0d0f1a] to-[#080a12] overflow-hidden">
              {/* Chat Header */}
              <div className="sticky top-0 z-10 bg-[#0d0f1a]/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden rounded-lg p-1 text-zinc-400 hover:bg-white/10"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <img
                    src={getChatAvatar(selectedConversation)}
                    alt={getChatName(selectedConversation)}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <h2 className="font-semibold text-white">{getChatName(selectedConversation)}</h2>
                    <p className="text-xs text-zinc-500">
                      {selectedConversation.conversation_type === 'group'
                        ? `${selectedConversation.members.length} members` 
                        : 'Active now'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {selectedConversation.conversation_type === 'group' && (
                    <button
                      onClick={handleShareGroup}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                      title="Share Group"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowVideoModal(true)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                    title="Start Video Call"
                  >
                    <Video className="h-5 w-5" />
                  </button>
                  <button
                    className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                    title="More Options"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Reply Indicator */}
              {replyingTo && (
                <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Reply className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-zinc-300">
                      Replying to: {replyingTo.message_content.substring(0, 50)}
                      {replyingTo.message_content.length > 50 && '...'}
                    </span>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                      <MessageCircle className="h-10 w-10 text-blue-400" />
                    </div>
                    <p className="text-zinc-400">No messages yet</p>
                    <p className="text-sm text-zinc-500 mt-1">Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message._id}
                      message={message}
                      isOwn={message.sender_id === currentUserId}
                      isSystem={message.message_type === 'system'}
                      isPinned={pinnedMessages.has(message._id)}
                      onReply={() => setReplyingTo(message)}
                      onCopy={() => copyMessage(message.message_content)}
                      onPin={() => pinMessage(message._id)}
                      onDelete={() => deleteMessage(message._id)}
                      onReact={(emoji) => reactToMessage(message._id, emoji)}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-white/10 bg-[#0d0f1a] p-4 flex-shrink-0">
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
                    onClick={() => console.log('📎 Attachment feature coming soon')}
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
        chatName={selectedConversation ? getChatName(selectedConversation) : ''}
      />

      {/* Share Group Modal */}
      <ShareGroupModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        conversationId={selectedConversation?._id || ''}
        conversationName={selectedConversation ? getChatName(selectedConversation) : ''}
        inviteLink={inviteLink}
      />

      {/* Create Conversation Modal */}
      <CreateConversationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createConversation}
      />
    </div>
  );
};

export default Inbox;