import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ExternalLink,
  Flag,
  MessageCircle,
  RefreshCw,
  Send,
  User,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import api from '@/lib/axios';
import socket from '@/lib/socket';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
import useGlobalState from '@/lib/global_state';
import useChatState from '@/components/ui/chat_bubble/chat_state';
import ReportMemberModal from '../team_modals/ReportMemberModal';

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
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Profile options menu state
  const [profileMenuTarget, setProfileMenuTarget] = useState<ProfileMenuTarget | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [reportTarget, setReportTarget] = useState<ProfileMenuTarget | null>(null);

  // Close profile menu on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileMenuTarget(null);
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

  // Socket listener for new messages & room management
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
            return prev;
          }
          return [...prev, payload];
        });
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('receiveMessage', handleNewMessage);
    socket.on('messageReplied', handleNewMessage);

    return () => {
      socket.off('connect', join);
      socket.emit('leaveRoom', { conversation_id: conversationId });
      socket.off('newMessage', handleNewMessage);
      socket.off('receiveMessage', handleNewMessage);
      socket.off('messageReplied', handleNewMessage);
    };
  }, [conversationId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversationId || isSending) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
      const res = await api.post('/api/inbox/message', {
        conversation_id: conversationId,
        message_content: messageText,
        message: messageText,
        message_type: 'text',
      });

      const newMsg = res.data?.data || res.data;
      if (newMsg && (newMsg._id || newMsg.id || newMsg.conversation_id)) {
        setMessages((prev) => {
          const msgId = String(newMsg._id || newMsg.id || '');
          if (msgId && prev.some((m) => String(m._id || m.id) === msgId)) {
            return prev;
          }
          return [...prev, newMsg];
        });
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
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
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

        {/* Message Thread Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50/20 dark:bg-zinc-950/20">
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
              const timeString = msg.created_at
                ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              const profileTarget: ProfileMenuTarget = {
                account_id: senderAccountId,
                display_name: rawName,
                avatar_path: rawAvatar,
                handle: memberInfo?.handle,
                team_role: memberInfo?.team_role,
                milestone_role: memberInfo?.milestone_role,
              };

              return (
                <div
                  key={msg._id || msg.id || idx}
                  className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
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

                  <div className={`max-w-md space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
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

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                          : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      {content}
                    </div>
                  </div>

                  {isMe && (
                    <img
                      src={senderAvatarUrl}
                      alt={rawName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackAvatarUrl(rawName);
                      }}
                      className="w-8 h-8 rounded-full object-cover border border-blue-500 shrink-0 self-end"
                    />
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Footer */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Type a team update or message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={!conversationId || isLoading}
            className="flex-1 px-4 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={isSending || !inputMessage.trim() || !conversationId}
            className="p-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Member Roster Sidebar (1 col) */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 h-[650px] overflow-y-auto">
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
