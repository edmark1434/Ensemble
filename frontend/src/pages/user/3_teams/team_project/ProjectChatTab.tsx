import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Copy,
  ExternalLink,
  FileText,
  Film,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Pin,
  PinOff,
  RefreshCw,
  Reply,
  Send,
  Smile,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import socket from '@/lib/socket';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
import useGlobalState from '@/lib/global_state';
import useChatState from '@/components/ui/chat_bubble/chat_state';
import ReportMemberModal from '../team_modals/ReportMemberModal';
import {
  chatAttachmentUrl,
  uploadChatAttachment,
  useInboxUploadMedia,
  InboxUploadMediaButton,
  InboxUploadMediaPreview,
} from '@/components/ui/inbox/inbox_functions/inbox_upload_image';
import {
  InboxEmojiPicker,
  InboxReactionBadges,
} from '@/components/ui/inbox/inbox_functions/inbox_emoji_picker';
import {
  InboxReplyQuote,
  scrollToRepliedMessage,
} from '@/components/ui/inbox/inbox_functions/inbox_reply_message';
import { InboxUnsentMessage } from '@/components/ui/inbox/inbox_functions/inbox_unsend_message';
import { ChatImagePreview } from '@/components/ui/inbox/inbox_functions/chat_image_preview';

interface ProjectChatTabProps {
  teamId: string;
  currentUserAccountId: string;
  members: any[];
}

interface ProfileMenuTarget {
  account_id: string;
  display_name: string;
  avatar_path?: string;
  handle?: string;
  team_role?: string;
  milestone_role?: string;
}

export const ProjectChatTab: React.FC<ProjectChatTabProps> = ({
  teamId,
  currentUserAccountId,
  members,
}) => {
  const navigate = useNavigate();
  const { user, setIsFloatingChatHidden } = useGlobalState();
  const myAccountId = currentUserAccountId || user?.account_id || user?.id || '';

  // Ensure global floating chat bubble/widget is hidden when viewing Project Chat
  useEffect(() => {
    setIsFloatingChatHidden(true);
    return () => {
      setIsFloatingChatHidden(false);
    };
  }, [setIsFloatingChatHidden]);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Replying & Hover toolbars
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
  const [activeEmojiMessageId, setActiveEmojiMessageId] = useState<string | null>(null);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; type?: string } | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Media upload hook (supports images and videos up to 3 files, 250MB limit)
  const {
    mediaList,
    fileInputRef,
    openFilePicker,
    handleFileChange,
    removeMedia,
    clearMedia,
  } = useInboxUploadMedia(3, 250);

  // Profile options menu state
  const [profileMenuTarget, setProfileMenuTarget] = useState<ProfileMenuTarget | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [reportTarget, setReportTarget] = useState<ProfileMenuTarget | null>(null);

  // Close menus on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileMenuTarget(null);
        setActiveEmojiMessageId(null);
        setActiveMenuMessageId(null);
        setShowInputEmojiPicker(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize or fetch team chat
  const initChat = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await api.post(`/api/team-projects/${teamId}/chat`);
      const convoId = res.data?.data?.conversationId || res.data?.conversationId;

      if (!convoId) {
        throw new Error('Could not initialize conversation');
      }

      setConversationId(convoId);

      // Fetch conversation details and messages
      const convoRes = await api.get(`/api/inbox/conversation/${convoId}`);
      const rawMessages =
        convoRes.data?.Messages ||
        convoRes.data?.messages ||
        convoRes.data?.data?.messages ||
        [];
      setMessages(Array.isArray(rawMessages) ? rawMessages : []);

      const rawPins =
        convoRes.data?.Inbox?.pinned_messages ||
        convoRes.data?.pinned_messages ||
        [];
      setPinnedMessages(Array.isArray(rawPins) ? rawPins : []);

      // Check for incoming prefill message from deliverable/milestone feedback
      const prefill = sessionStorage.getItem('team_chat_prefill');
      if (prefill) {
        setInputMessage(prefill);
        sessionStorage.removeItem('team_chat_prefill');
      }
    } catch (err: any) {
      console.error('Failed to init team chat:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to load team chat';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  // Socket listener for new messages, replies, reactions, deletions, and pins
  useEffect(() => {
    if (!conversationId) return;

    if (!socket.connected) {
      socket.connect();
    }

    const join = () => {
      socket.emit('joinRoom', { conversation_id: conversationId });
    };

    if (socket.connected) {
      join();
    }
    socket.on('connect', join);

    const handleNewMessage = (payload: any) => {
      if (String(payload?.conversation_id || payload?.conversationId) === String(conversationId)) {
        setMessages((prev) => {
          const payloadId = String(payload._id || payload.id || '');
          if (payloadId && prev.some((m) => String(m._id || m.id) === payloadId)) {
            return prev.map((m) => String(m._id || m.id) === payloadId ? payload : m);
          }
          return [...prev, payload];
        });
      }
    };

    const handleReactionUpdated = (payload: any) => {
      if (String(payload?.conversation_id || payload?.conversationId) === String(conversationId)) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m._id || m.id) === String(payload._id || payload.id)
              ? { ...m, message_react: payload.message_react }
              : m
          )
        );
      }
    };

    const handleMessageDeleted = ({ conversation_id, message_id }: any) => {
      if (String(conversation_id) === String(conversationId)) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m._id || m.id) === String(message_id)
              ? { ...m, is_deleted: true, is_unsent: true, message_content: '', attachments: [] }
              : m
          )
        );
      }
    };

    const handlePinsUpdated = (payload: any) => {
      if (String(payload?.conversation_id || payload?.conversationId) === String(conversationId)) {
        setPinnedMessages(payload.pinned_messages || []);
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('receiveMessage', handleNewMessage);
    socket.on('messageReplied', handleNewMessage);
    socket.on('messageReactionUpdated', handleReactionUpdated);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('pinnedMessagesUpdated', handlePinsUpdated);
    socket.on('messagePinned', handlePinsUpdated);
    socket.on('messageUnpinned', handlePinsUpdated);

    return () => {
      socket.off('connect', join);
      socket.emit('leaveRoom', { conversation_id: conversationId });
      socket.off('newMessage', handleNewMessage);
      socket.off('receiveMessage', handleNewMessage);
      socket.off('messageReplied', handleNewMessage);
      socket.off('messageReactionUpdated', handleReactionUpdated);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('pinnedMessagesUpdated', handlePinsUpdated);
      socket.off('messagePinned', handlePinsUpdated);
      socket.off('messageUnpinned', handlePinsUpdated);
    };
  }, [conversationId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputMessage.trim() && mediaList.length === 0) || !conversationId || isSending) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
      const uploadedAttachments = await Promise.all(
        mediaList.map((media) => uploadChatAttachment(media, 'chat-attachments'))
      );
      clearMedia();

      if (replyToMessage) {
        const parentId = String(replyToMessage._id || replyToMessage.id);
        try {
          await useChatState.getState().replyMessage(
            conversationId,
            parentId,
            messageText,
            uploadedAttachments as any
          );
        } catch {
          await api.post('/api/inbox/message', {
            conversation_id: conversationId,
            message_content: messageText,
            message: messageText,
            message_id_reply: parentId,
            parent_message_id: parentId,
            attachments: uploadedAttachments,
            message_type: uploadedAttachments.length > 0 ? uploadedAttachments[0].attachment_type : 'text',
          });
        }
        setReplyToMessage(null);
      } else {
        try {
          await useChatState.getState().sendMessage(
            conversationId,
            messageText,
            uploadedAttachments as any
          );
        } catch {
          await api.post('/api/inbox/message', {
            conversation_id: conversationId,
            message_content: messageText,
            message: messageText,
            attachments: uploadedAttachments,
            message_type: uploadedAttachments.length > 0 ? uploadedAttachments[0].attachment_type : 'text',
          });
        }
      }
    } catch (err: any) {
      showErrorToast(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to send message'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const targetId = String(messageId);
    const msg = messages.find((m) => String(m._id || m.id) === targetId);
    const alreadyReacted = Boolean(
      msg?.message_react?.some(
        (r: any) => String(r.account_id) === String(myAccountId) && r.react_type === emoji
      )
    );

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => {
        if (String(m._id || m.id) !== targetId) return m;
        const currentReacts = m.message_react || [];
        const updated = alreadyReacted
          ? currentReacts.filter(
              (r: any) => !(String(r.account_id) === String(myAccountId) && r.react_type === emoji)
            )
          : [...currentReacts, { account_id: myAccountId, react_type: emoji, created_at: new Date() }];
        return { ...m, message_react: updated };
      })
    );
    setActiveEmojiMessageId(null);

    try {
      await useChatState.getState().reactMessage(targetId, emoji, alreadyReacted);
    } catch {
      if (alreadyReacted) {
        await api.delete(`/api/inbox/message/${targetId}/reaction`, { data: { react_type: emoji } }).catch(() => {});
      } else {
        await api.put(`/api/inbox/message/${targetId}/reaction`, { react_type: emoji }).catch(() => {});
      }
    }
  };

  const handleTogglePin = async (messageId: string) => {
    const targetId = String(messageId);
    const isCurrentlyPinned = pinnedMessages.some(
      (p: any) => String(p.message_id || p._id || p.id) === targetId
    );
    setActiveMenuMessageId(null);

    try {
      if (conversationId) {
        await useChatState.getState().pinMessage(conversationId, targetId, isCurrentlyPinned);
        showSuccessToast(isCurrentlyPinned ? 'Message unpinned' : 'Message pinned to channel');
      }
    } catch {
      try {
        if (isCurrentlyPinned) {
          await api.delete(`/api/inbox/conversation/${conversationId}/pin/${targetId}`);
          setPinnedMessages((prev) =>
            prev.filter((p: any) => String(p.message_id || p._id || p.id) !== targetId)
          );
        } else {
          await api.post(`/api/inbox/conversation/${conversationId}/pin/${targetId}`);
          setPinnedMessages((prev) => [
            ...prev,
            { message_id: targetId, pinned_by: myAccountId, pinned_at: new Date() },
          ]);
        }
      } catch (e: any) {
        showErrorToast(e?.message || 'Failed to update pin');
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const targetId = String(messageId);
    setActiveMenuMessageId(null);

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        String(m._id || m.id) === targetId
          ? { ...m, is_deleted: true, is_unsent: true, message_content: '', attachments: [] }
          : m
      )
    );

    try {
      await useChatState.getState().deleteMessage(targetId);
      showSuccessToast('Message deleted');
    } catch {
      try {
        await api.delete(`/api/inbox/message/${targetId}`);
        showSuccessToast('Message deleted');
      } catch (e: any) {
        showErrorToast(e?.message || 'Failed to delete message');
      }
    }
  };

  const handleCopyText = (content: string) => {
    setActiveMenuMessageId(null);
    if (!content) return;
    navigator.clipboard.writeText(content);
    showSuccessToast('Message copied to clipboard');
  };

  const handleJumpToMessage = (messageId: string) => {
    scrollToRepliedMessage(messagesContainerRef as any, messageId);
  };

  const openDedicatedInbox = () => {
    if (!conversationId) return;
    navigate('/inbox/marketplace', {
      state: { conversationId },
    });
  };

  // Open profile dropdown options menu
  const handleProfileClick = (e: React.MouseEvent, target: ProfileMenuTarget) => {
    e.stopPropagation();
    if (!target.account_id) return;

    const isMe = Boolean(
      (myAccountId && String(target.account_id) === String(myAccountId)) ||
      (user?.handle && target.handle && String(target.handle).toLowerCase() === String(user.handle).toLowerCase()) ||
      (user?.name && target.display_name && String(target.display_name).toLowerCase() === String(user.name).toLowerCase()) ||
      (user?.display_name && target.display_name && String(target.display_name).toLowerCase() === String(user.display_name).toLowerCase())
    );

    if (isMe) {
      navigate(`/profile/${target.account_id}`);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 240;

    let x = rect.left;
    if (x + menuWidth > window.innerWidth - 16) {
      x = Math.max(16, rect.right - menuWidth);
    }
    if (x < 16) x = 16;

    let y = rect.bottom + 6;
    if (y + menuHeight > window.innerHeight - 16) {
      y = Math.max(16, rect.top - menuHeight - 6);
    }

    setMenuCoords({ x, y });
    setProfileMenuTarget(target);
    setIsFollowing(false);
    setIsLoadingFollow(true);

    api
      .get(`/api/accounts/${target.account_id}/follow-status`)
      .then((res) => {
        setIsFollowing(Boolean(res.data?.isFollowing));
      })
      .catch(() => {
        setIsFollowing(false);
      })
      .finally(() => {
        setIsLoadingFollow(false);
      });
  };

  const handleViewProfile = () => {
    if (!profileMenuTarget?.account_id) return;
    navigate(`/profile/${profileMenuTarget.account_id}`);
    setProfileMenuTarget(null);
  };

  const handleToggleFollow = async () => {
    if (!profileMenuTarget?.account_id || isLoadingFollow) return;
    setIsLoadingFollow(true);
    try {
      if (isFollowing) {
        await api.delete(`/api/accounts/${profileMenuTarget.account_id}/follow`);
        setIsFollowing(false);
        showSuccessToast(`Unfollowed ${profileMenuTarget.display_name}`);
      } else {
        await api.post(`/api/accounts/${profileMenuTarget.account_id}/follow`);
        setIsFollowing(true);
        showSuccessToast(`Followed ${profileMenuTarget.display_name}!`);
      }
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to update follow status');
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const handleDirectMessage = async () => {
    if (!profileMenuTarget?.account_id) return;
    const target = profileMenuTarget;
    setProfileMenuTarget(null);
    try {
      await useChatState.getState().openDirectChat({
        account_id: target.account_id,
        name: target.display_name,
        avatarUrl: target.avatar_path,
      });
      showSuccessToast(`Opened chat with ${target.display_name}`);
    } catch (err: any) {
      navigate('/inbox/direct', {
        state: { other_account_id: target.account_id },
      });
    }
  };

  const handleInitiateReport = () => {
    if (!profileMenuTarget) return;
    setReportTarget(profileMenuTarget);
    setProfileMenuTarget(null);
  };

  const handleSubmitReport = async (reason: string, description: string) => {
    if (!reportTarget) return;
    try {
      await api.post(`/api/team-projects/${teamId}/report`, {
        category: reason,
        description,
        target_account_id: reportTarget.account_id,
      });
      showSuccessToast(`Report submitted for ${reportTarget.display_name}`);
      setReportTarget(null);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || err?.message || 'Failed to submit report');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
      {/* Main Chat Box (3 cols) */}
      <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col h-[650px] overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Team Workspace Channel
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Shared communication channel for all project contributors & client.
              </p>
            </div>
          </div>

          <button
            onClick={openDedicatedInbox}
            disabled={!conversationId}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <span>Open in Full Inbox</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top Pinned Message Banner */}
        {pinnedMessages.length > 0 && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 shrink-0">
            <div
              onClick={() => {
                const firstPin = pinnedMessages[0];
                if (firstPin) handleJumpToMessage(firstPin.message_id || firstPin._id);
              }}
              className="flex items-center gap-2 cursor-pointer hover:underline truncate"
            >
              <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500/20" />
              <span className="font-semibold shrink-0">Pinned ({pinnedMessages.length}):</span>
              <span className="truncate opacity-90">
                {(() => {
                  const firstPin = pinnedMessages[0];
                  const found = messages.find(
                    (m) => String(m._id || m.id) === String(firstPin?.message_id || firstPin?._id)
                  );
                  return found?.message_content || 'Jump to pinned message';
                })()}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const firstPin = pinnedMessages[0];
                if (firstPin) handleTogglePin(firstPin.message_id || firstPin._id);
              }}
              className="p-1 hover:bg-amber-500/20 rounded text-amber-600 dark:text-amber-400 transition cursor-pointer"
              title="Unpin"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Message Thread Body with Thin Seamless Scrollbar */}
        <div
          ref={messagesContainerRef}
          className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50/20 dark:bg-zinc-950/20 inbox-scroll-thin custom-scrollbar"
        >
          {isLoading ? (
            <div className="h-full flex items-center justify-center flex-col gap-2 text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs">Loading team messages...</span>
            </div>
          ) : loadError ? (
            <div className="h-full flex items-center justify-center flex-col gap-2 text-rose-500 p-4 text-center">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <p className="text-xs font-bold">{loadError}</p>
              <button
                onClick={initChat}
                className="mt-2 text-xs text-blue-600 hover:underline font-semibold"
              >
                Retry connection
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center flex-col gap-2 text-zinc-400 p-6 text-center">
              <MessageCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-1" />
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                No messages yet
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-xs">
                Start the conversation with your team by saying hello or sharing an update on your deliverables!
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const msgId = String(msg._id || msg.id || idx);
              const senderAccountId = String(
                msg.sender_id || msg.sender_account_id || msg.sender?._id || msg.sender?.account_id || ''
              );
              const isMe = Boolean(
                (myAccountId && senderAccountId === String(myAccountId)) ||
                (user?.account_id && senderAccountId === String(user.account_id)) ||
                (user?.handle && (msg.sender?.handle || msg.sender_handle) && String(msg.sender?.handle || msg.sender_handle).toLowerCase() === String(user.handle).toLowerCase()) ||
                (user?.name && (msg.author_name || msg.sender?.display_name || msg.sender_name) && String(msg.author_name || msg.sender?.display_name || msg.sender_name).toLowerCase() === String(user.name).toLowerCase())
              );

              const memberInfo = members.find((m) => String(m.account_id) === senderAccountId);
              const rawAvatar = isMe
                ? (memberInfo?.avatar_path || user?.avatar_preset_url || user?.avatar_url || user?.avatar_path || msg.sender?.avatar_path || msg.sender_avatar)
                : (memberInfo?.avatar_path || msg.sender?.avatar_path || msg.sender_avatar);

              const rawName = isMe
                ? (memberInfo?.display_name || user?.display_name || user?.name || msg.author_name || msg.sender?.display_name || 'You')
                : (memberInfo?.display_name || msg.author_name || msg.sender?.display_name || msg.sender_name || 'Teammate');

              const senderAvatarUrl = constructAvatarUrl(rawAvatar, rawName);
              const senderName = isMe ? `${rawName} (You)` : rawName;
              const content = msg.message_content || msg.message || msg.content || '';
              const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];
              const hasText = Boolean(content && content.trim());
              const timeString = msg.created_at
                ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const isDeleted = Boolean(msg.is_deleted || msg.is_unsent);
              const isPinned = pinnedMessages.some(
                (p: any) => String(p.message_id || p._id || p.id) === msgId
              );

              const isEmojiOpen = activeEmojiMessageId === msgId;
              const isMenuOpen = activeMenuMessageId === msgId;

              const profileTarget: ProfileMenuTarget = {
                account_id: senderAccountId,
                display_name: rawName,
                avatar_path: rawAvatar,
                handle: memberInfo?.handle,
                team_role: memberInfo?.team_role,
                milestone_role: memberInfo?.milestone_role,
              };

              // Message Hover Actions (Match User Screenshot: Emoji, Reply, 3-dots)
              const renderHoverActions = () => {
                if (isDeleted) return null;
                return (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mb-2 shrink-0">
                    {/* 1. Emoji Reaction Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveEmojiMessageId(isEmojiOpen ? null : msgId);
                          setActiveMenuMessageId(null);
                        }}
                        title="React"
                        className="rounded-full p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <Smile className="w-4 h-4" />
                      </button>

                      {isEmojiOpen && (
                        <InboxEmojiPicker
                          isSender={isMe}
                          onSelectEmoji={(emoji) => handleToggleReaction(msgId, emoji)}
                          onClose={() => setActiveEmojiMessageId(null)}
                        />
                      )}
                    </div>

                    {/* 2. Reply Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setReplyToMessage(msg);
                        setActiveEmojiMessageId(null);
                        setActiveMenuMessageId(null);
                        inputRef.current?.focus();
                      }}
                      title="Reply"
                      className="rounded-full p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                    >
                      <Reply className="w-4 h-4" />
                    </button>

                    {/* 3. More Options Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuMessageId(isMenuOpen ? null : msgId);
                          setActiveEmojiMessageId(null);
                        }}
                        title="More options"
                        className="rounded-full p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          className={`absolute bottom-full mb-1 ${
                            isMe ? 'right-0' : 'left-0'
                          } z-30 w-36 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1 shadow-xl text-xs space-y-0.5`}
                        >
                          {/* Pin / Unpin */}
                          <button
                            type="button"
                            onClick={() => handleTogglePin(msgId)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-left"
                          >
                            {isPinned ? (
                              <>
                                <PinOff className="w-3.5 h-3.5 text-amber-500" />
                                <span>Unpin</span>
                              </>
                            ) : (
                              <>
                                <Pin className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Pin</span>
                              </>
                            )}
                          </button>

                          {/* Copy Text */}
                          {content && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(content)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-left"
                            >
                              <Copy className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Copy Text</span>
                            </button>
                          )}

                          {/* Delete / Unsend */}
                          {isMe && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msgId)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}

                          {/* Report */}
                          {!isMe && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuMessageId(null);
                                setReportTarget(profileTarget);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer text-left"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              <span>Report</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div
                  key={msgId}
                  data-message-id={msgId}
                  className={`group relative flex items-end gap-2 ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Sender Avatar (!isMe) */}
                  {!isMe && (
                    <img
                      src={senderAvatarUrl}
                      alt={rawName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackAvatarUrl(rawName);
                      }}
                      onClick={(e) => handleProfileClick(e, profileTarget)}
                      className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 self-end cursor-pointer hover:border-blue-500 transition"
                      title="Click for profile options"
                    />
                  )}

                  {/* Hover Actions when isMe (placed to the left of the bubble) */}
                  {isMe && renderHoverActions()}

                  {/* Message Bubble Column */}
                  <div className={`max-w-md sm:max-w-lg space-y-1 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Header info (Name + Timestamp + Pinned indicator) */}
                    <div className={`flex items-center gap-2 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {isPinned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          <Pin className="w-3 h-3 fill-amber-500/20" />
                          Pinned
                        </span>
                      )}
                      <span
                        onClick={(e) => {
                          if (!isMe && senderAccountId) {
                            handleProfileClick(e, profileTarget);
                          }
                        }}
                        className={`text-[11px] font-bold text-zinc-600 dark:text-zinc-400 ${
                          !isMe
                            ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition'
                            : ''
                        }`}
                        title={!isMe ? 'Click for profile options' : undefined}
                      >
                        {senderName}
                      </span>
                      {timeString && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {timeString}
                        </span>
                      )}
                    </div>

                    {/* Bubble Content */}
                    {isDeleted ? (
                      <InboxUnsentMessage isSender={isMe} />
                    ) : (
                      <div
                        className={`relative p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                            : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-bl-xs shadow-2xs'
                        } ${isPinned ? 'ring-1 ring-amber-400/50' : ''}`}
                      >
                        {/* Parent Message Reply Quote */}
                        {msg.message_id_reply && (
                          <InboxReplyQuote
                            replyToMessageId={msg.message_id_reply}
                            messages={messages}
                            currentUserId={myAccountId}
                            onJumpToReply={handleJumpToMessage}
                          />
                        )}

                        {/* Attachments (Images, Videos, Files) */}
                        {attachments.length > 0 && (
                          <div
                            className={`gap-1.5 grid ${hasText ? 'mb-2' : ''} ${
                              attachments.length === 1
                                ? 'grid-cols-1 w-56 sm:w-64'
                                : attachments.length === 2
                                ? 'grid-cols-2 w-64 sm:w-72'
                                : 'grid-cols-3 w-72 sm:w-80'
                            }`}
                          >
                            {attachments.map((a: any, aIdx: number) => {
                              const attachmentKey = a.attachment_key || a.attachment_url;
                              const attachmentUrl = chatAttachmentUrl(attachmentKey);
                              const isFile = a.attachment_type === 'file';
                              const isVideo = a.attachment_type === 'video';

                              return (
                                <div
                                  key={a.attachment_id || aIdx}
                                  onClick={() => {
                                    if (!isFile) {
                                      setExpandedMedia({
                                        url: attachmentUrl,
                                        type: a.attachment_type || (isVideo ? 'video' : 'image'),
                                      });
                                    }
                                  }}
                                  className="relative min-h-20 w-full rounded-xl overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 transition group/media shadow-2xs ring-1 ring-black/5 dark:ring-white/5 bg-zinc-900/10 dark:bg-black/40"
                                >
                                  {isFile ? (
                                    <a
                                      href={attachmentUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className={`flex w-full items-center gap-2 p-2.5 text-xs truncate ${
                                        isMe ? 'text-white' : 'text-blue-600 dark:text-blue-400'
                                      }`}
                                    >
                                      <FileText className="w-4 h-4 shrink-0" />
                                      <span className="truncate">{a.attachment_name || 'Download file'}</span>
                                    </a>
                                  ) : isVideo ? (
                                    <div className="relative w-full h-28 bg-black flex items-center justify-center">
                                      <video src={attachmentUrl} className="w-full h-full object-cover" muted />
                                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <Film className="w-6 h-6 text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    <img
                                      src={attachmentUrl}
                                      alt="Attachment"
                                      className="w-full h-28 object-cover rounded-xl"
                                      loading="lazy"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Text Message */}
                        {hasText && <span>{content}</span>}

                        {/* Reaction Badges */}
                        <InboxReactionBadges
                          reactions={msg.message_react || []}
                          currentUserId={myAccountId}
                          isSender={isMe}
                          onToggleReaction={(emoji) => handleToggleReaction(msgId, emoji)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Hover Actions when !isMe (placed to the right of the bubble) */}
                  {!isMe && renderHoverActions()}

                  {/* My Own Avatar */}
                  {isMe && (
                    <img
                      src={senderAvatarUrl}
                      alt={rawName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackAvatarUrl(rawName);
                      }}
                      onClick={(e) => handleProfileClick(e, profileTarget)}
                      className="w-8 h-8 rounded-full object-cover border border-blue-500 shrink-0 self-end cursor-pointer hover:opacity-85 transition"
                      title="View your profile"
                    />
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Footer (Match User Screenshot: Blue Pill + Inside Smile + Outside Clip + Send) */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
          {/* Replying Quote Bar */}
          {replyToMessage && (
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <Reply className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  Replying to:{' '}
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {replyToMessage.message_content
                      ? replyToMessage.message_content.substring(0, 50) +
                        (replyToMessage.message_content.length > 50 ? '...' : '')
                      : replyToMessage.attachments?.length
                      ? 'Attachment'
                      : 'Message'}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyToMessage(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Attachment Preview Chips */}
          {mediaList.length > 0 && (
            <InboxUploadMediaPreview
              mediaList={mediaList}
              onRemove={removeMedia}
              batchLimitMB={250}
            />
          )}

          {/* Input Form matching user screenshot 1 */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 flex items-center gap-2 bg-white dark:bg-zinc-900"
          >
            {/* Blue Pill Input */}
            <div className="relative flex-1 flex items-center rounded-full border border-blue-500 bg-white dark:bg-zinc-800/60 px-4 py-2 transition focus-within:ring-2 focus-within:ring-blue-500/20 shadow-2xs">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={!conversationId || isLoading}
                className="flex-1 bg-transparent text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none pr-8"
              />

              {/* Inside Smile Button */}
              <button
                type="button"
                onClick={() => setShowInputEmojiPicker((v) => !v)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition p-0.5 cursor-pointer shrink-0"
                aria-label="Add emoji"
              >
                <Smile className="w-5 h-5 text-zinc-400" />
              </button>

              {showInputEmojiPicker && (
                <InboxEmojiPicker
                  isSender
                  onSelectEmoji={(emoji) => {
                    setInputMessage((prev) => prev + emoji);
                    inputRef.current?.focus();
                  }}
                  onClose={() => setShowInputEmojiPicker(false)}
                />
              )}
            </div>

            {/* Paperclip Button outside */}
            <InboxUploadMediaButton
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
              onClick={openFilePicker}
              disabled={mediaList.length >= 3}
              title="Attach media (images or videos)"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isSending || (!inputMessage.trim() && mediaList.length === 0) || !conversationId}
              className="p-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Member Roster Sidebar (1 col) */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 h-[650px] overflow-y-auto inbox-scroll-thin custom-scrollbar">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
            Team Members ({members.length})
          </h4>
        </div>

        <div className="space-y-3">
          {members.map((m: any) => {
            const isMe = Boolean(
              (myAccountId && String(m.account_id) === String(myAccountId)) ||
              (user?.handle && m.handle && String(m.handle).toLowerCase() === String(user.handle).toLowerCase()) ||
              (user?.name && m.display_name && String(m.display_name).toLowerCase() === String(user.name).toLowerCase()) ||
              (user?.display_name && m.display_name && String(m.display_name).toLowerCase() === String(user.display_name).toLowerCase())
            );

            const profileTarget: ProfileMenuTarget = {
              account_id: m.account_id,
              display_name: m.display_name,
              avatar_path: m.avatar_path,
              handle: m.handle,
              team_role: m.team_role,
              milestone_role: m.milestone_role,
            };

            return (
              <div
                key={m.account_id}
                onClick={(e) => handleProfileClick(e, profileTarget)}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition cursor-pointer group"
                title="Click for profile options"
              >
                <img
                  src={constructAvatarUrl(m.avatar_path, m.display_name)}
                  alt={m.display_name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getFallbackAvatarUrl(m.display_name);
                  }}
                  className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 group-hover:border-blue-500 transition"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 dark:hover:text-blue-400 transition">
                      {m.display_name}
                    </span>
                    {isMe && (
                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        You
                      </span>
                    )}
                    {m.team_role === 'Owner' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        Client
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {m.milestone_role || m.team_role || 'Contributor'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Profile Options Context Menu */}
      {profileMenuTarget && menuCoords && (
        <>
          {/* Backdrop for click outside */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setProfileMenuTarget(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setProfileMenuTarget(null);
            }}
          />

          <div
            style={{
              position: 'fixed',
              left: `${menuCoords.x}px`,
              top: `${menuCoords.y}px`,
            }}
            className="z-50 w-60 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl p-1.5 space-y-1 animate-scale-in"
          >
            {/* Target User Mini Card Header */}
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 mb-1">
              <img
                src={constructAvatarUrl(profileMenuTarget.avatar_path, profileMenuTarget.display_name)}
                alt={profileMenuTarget.display_name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getFallbackAvatarUrl(profileMenuTarget.display_name);
                }}
                className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {profileMenuTarget.display_name}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {profileMenuTarget.handle
                    ? `@${profileMenuTarget.handle}`
                    : (profileMenuTarget.milestone_role || profileMenuTarget.team_role || 'Contributor')}
                </p>
              </div>
            </div>

            {/* Option 1: View Profile */}
            <button
              type="button"
              onClick={handleViewProfile}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer text-left"
            >
              <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <span>View Profile</span>
            </button>

            {/* Option 2: Follow User / Following */}
            <button
              type="button"
              onClick={handleToggleFollow}
              disabled={isLoadingFollow}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                {isFollowing ? (
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <UserPlus className="w-4 h-4 text-blue-500" />
                )}
                <span>{isFollowing ? 'Following' : 'Follow User'}</span>
              </div>
              {isLoadingFollow && <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" />}
            </button>

            {/* Option 3: Message */}
            <button
              type="button"
              onClick={handleDirectMessage}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer text-left"
            >
              <MessageCircle className="w-4 h-4 text-blue-500" />
              <span>Message</span>
            </button>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

            {/* Option 4: Report User */}
            <button
              type="button"
              onClick={handleInitiateReport}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer text-left"
            >
              <Flag className="w-4 h-4 text-rose-500" />
              <span>Report User</span>
            </button>
          </div>
        </>
      )}

      {/* Lightbox / Fullscreen Image or Video Preview */}
      <ChatImagePreview
        url={expandedMedia?.url || null}
        type={expandedMedia?.type || 'image'}
        onClose={() => setExpandedMedia(null)}
      />

      {/* Report Member Modal */}
      {reportTarget && (
        <ReportMemberModal
          isOpen={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
          memberName={reportTarget.display_name}
          onSubmit={handleSubmitReport}
        />
      )}
    </div>
  );
};

export default ProjectChatTab;
