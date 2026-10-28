import React, { useMemo, useState } from "react";
import { X, CheckCheck, Archive, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import socket from "@/lib/socket";
import api from "@/lib/axios";
import TicketInviteActions from "@/components/nav/TicketInviteActions";
import { getFollower, getNotificationIcon, getNotificationLabel } from "@/lib/notificationTypes";
import { useAccountAvatars } from "@/lib/accountAvatars";
import AccountAvatar from "@/components/ui/AccountAvatar";
import SwipeRow from "@/components/ui/SwipeRow";
import {
  archiveAllPopupNotifications,
  archivePopupNotification,
  isPopupArchived,
} from "@/lib/popupNotificationStorage";

interface Notification {
  notification_id: string;
  message: string;
  is_read: boolean;
  reference_table: string;
  reference_prefix: string;
  reference_path: string;
  reference_id: string;
  created_at: string;
}

interface UserNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationsData: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  accountId?: string;
}

const UserNotificationModal: React.FC<UserNotificationModalProps> = ({
  isOpen,
  onClose,
  notificationsData,
  setNotifications,
  accountId,
}) => {
  const navigate = useNavigate();
  const [sessionArchivedIds, setSessionArchivedIds] = useState<Set<string>>(new Set());
  const [isAllCleared, setIsAllCleared] = useState(false);

  // Filter out notifications archived from the popup (they remain available on /notifications full view)
  const visibleNotifications = useMemo(() => {
    if (isAllCleared) return [];
    return notificationsData.filter(
      (n) => !sessionArchivedIds.has(n.notification_id) && !isPopupArchived(n, accountId)
    );
  }, [notificationsData, sessionArchivedIds, isAllCleared, accountId]);

  const followerIds = visibleNotifications
    .filter((n) => n.reference_prefix === "follow")
    .map((n) => n.reference_id);
  const avatars = useAccountAvatars(followerIds);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await api.patch(
          `/api/notifications/${notification.notification_id}/read`
        );
        setNotifications((prev) =>
          prev.map((item) =>
            item.notification_id === notification.notification_id
              ? { ...item, is_read: true }
              : item
          )
        );
        if (socket.connected) {
          socket.emit("markMessageAsRead", notification.notification_id);
        }
      } catch (error) {
        console.error("Failed to mark notification as read", error);
        return;
      }
    }

    onClose();
    let referencePath = notification.reference_path || "";

    // For offer_received notifications, ensure the URL includes the contract ID
    if (notification.reference_prefix === "offer_received" && notification.reference_id) {
      if (!referencePath.includes("/offer/")) {
        referencePath = `${referencePath}/offer/${notification.reference_id}`;
      }
    }

    const directConversationMatch = referencePath.match(
      /^\/inbox\/(?!direct(?:\/|$)|marketplace(?:\/|$))([^/?#]+)/
    );
    const queryIndex = referencePath.indexOf("?");
    const conversationId =
      new URLSearchParams(
        queryIndex >= 0 ? referencePath.slice(queryIndex + 1) : ""
      ).get("conversation") || directConversationMatch?.[1];

    if (conversationId) {
      navigate("/inbox/direct", {
        state: { conversationId },
      });
      return;
    }
    navigate(referencePath);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/api/notifications/read-all");
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
      if (socket.connected) {
        socket.emit("markAllNotificationsAsRead");
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  const handleArchiveNotification = (notificationId: string) => {
    archivePopupNotification(notificationId, accountId);
    setSessionArchivedIds((prev) => new Set(prev).add(notificationId));
  };

  const handleArchiveAll = () => {
    archiveAllPopupNotifications(accountId);
    setIsAllCleared(true);
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor(
      (Date.now() - new Date(date).getTime()) / 1000
    );

    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    return new Date(date).toLocaleDateString();
  };

  if (!isOpen) return null;

  const unreadCount = visibleNotifications.filter((n) => !n.is_read).length;

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#11131c] shadow-2xl overflow-hidden z-50 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200/80 dark:border-white/10 px-4 py-3 bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {visibleNotifications.length > 0 && (
            <button
              onClick={handleArchiveAll}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-1 text-[11px] font-medium"
              title="Empty popup (keeps all in Full View)"
            >
              <Archive size={14} />
              <span>Empty</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-[420px] overflow-y-auto p-2 space-y-2 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.3)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-track]:bg-transparent">
        {visibleNotifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-zinc-500 mb-3 border border-gray-200/60 dark:border-white/10">
              <Inbox className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">No notifications</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              You're all caught up! Stored notifications are in Full View.
            </p>
          </div>
        ) : (
          visibleNotifications.map((notification) => {
            const def = getNotificationIcon(notification.reference_prefix);
            const isFollow = notification.reference_prefix === "follow";
            const follower = isFollow ? getFollower(notification.message) : null;
            const followerName = follower?.name ?? null;
            const avatarUrl = isFollow ? avatars[notification.reference_id] : null;

            const isTicketInvite = notification.reference_prefix === "TICKET_INVITE";
            return (
              <SwipeRow
                key={notification.notification_id}
                direction="left"
                actionWidth={74}
                radius={12}
                actionColor="#334155"
                drawerColor="#334155"
                isUnread={!notification.is_read}
                className="mb-1.5"
                onCommit={() => handleArchiveNotification(notification.notification_id)}
                actions={[
                  {
                    id: "archive",
                    label: "Archive",
                    icon: <Archive size={16} strokeWidth={2.2} />,
                    color: "#334155",
                    onSelect: () => handleArchiveNotification(notification.notification_id),
                  },
                ]}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (isTicketInvite) return;
                    handleNotificationClick(notification);
                  }}
                  onKeyDown={(event) => {
                    if (isTicketInvite) return;
                    if (event.key === 'Enter' || event.key === ' ') handleNotificationClick(notification);
                  }}
                  className="w-full flex items-start gap-3 p-3 text-left transition-all cursor-pointer group/card"
                >
                  {/* Icon / Avatar on Left */}
                  <div className="relative shrink-0 pt-0.5">
                    {isFollow ? (
                      <AccountAvatar url={avatarUrl} name={followerName} className="h-9 w-9 rounded-full ring-1 ring-gray-200/80 dark:ring-white/10" />
                    ) : (
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/[0.06] border border-gray-200/80 dark:border-white/10 ${def.text}`}>
                        {def.icon}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-gray-500 dark:text-zinc-400">
                        {getNotificationLabel(notification.reference_prefix)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500" />
                        )}
                        {/* Desktop quick archive button on hover */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveNotification(notification.notification_id);
                          }}
                          className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 rounded hover:bg-gray-200/60 dark:hover:bg-white/10 cursor-pointer"
                          title="Archive from popup"
                        >
                          <Archive size={13} />
                        </button>
                      </div>
                    </div>

                    {followerName ? (
                      <p className="mt-1 text-xs text-gray-800 dark:text-zinc-200 leading-snug">
                        <span className="font-bold text-gray-900 dark:text-white">{followerName}</span> started following you
                      </p>
                    ) : (
                      <p className={`mt-1 text-xs leading-snug line-clamp-2 ${
                        notification.is_read
                          ? "text-gray-600 dark:text-zinc-400 font-normal"
                          : "text-gray-900 dark:text-zinc-100 font-semibold"
                      }`}>
                        {notification.message}
                      </p>
                    )}

                    {isTicketInvite && notification.reference_id ? (
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <TicketInviteActions
                          ticketId={notification.reference_id}
                          compact
                          onDone={(result, chatId) => {
                            setNotifications((prev) => prev.map((item) => item.notification_id === notification.notification_id ? { ...item, is_read: true } : item));
                            void api.patch(`/api/notifications/${notification.notification_id}/read`).catch(() => undefined);
                            if (result === 'accepted' && chatId) {
                              onClose();
                              navigate('/inbox/direct', { state: { conversationId: chatId } });
                            }
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </SwipeRow>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200/80 dark:border-white/10 p-2.5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-2">
        <button
          onClick={() => {
            onClose();
            navigate("/notifications");
          }}
          className="flex-1 py-1.5 px-3 rounded-xl text-center text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
        >
          Open Full View
        </button>
        {visibleNotifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex-1 py-1.5 px-3 rounded-xl text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition cursor-pointer flex items-center justify-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default UserNotificationModal;
