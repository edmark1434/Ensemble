import React from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import socket from "@/lib/socket";
import api from "@/lib/axios";
import { getFollower, getNotificationIcon, getNotificationLabel } from "@/lib/notificationTypes";
import { useAccountAvatars } from "@/lib/accountAvatars";
import AccountAvatar from "@/components/ui/AccountAvatar";

interface Notification {
  notification_id: string;
  message: string;
  is_read: boolean;
  reference_table: string;
  reference_prefix: string;
  reference_path: string;
  reference_id: string;
  account_id: string;
  created_at: string;
  deleted_at: string | null;
}

interface UserNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationsData: Notification[];
  setNotifications: React.Dispatch<
    React.SetStateAction<Notification[]>
  >;
}

const UserNotificationModal: React.FC<UserNotificationModalProps> = ({
  isOpen,
  onClose,
  notificationsData,
  setNotifications,
}) => {
  const navigate = useNavigate();
  const avatars = useAccountAvatars(
    isOpen
      ? notificationsData.filter((n) => n.reference_prefix === "follow").map((n) => n.reference_id)
      : []
  );

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

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-2xl backdrop-blur-xl overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Notifications
        </h3>

        <button
          onClick={onClose}
          className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Notification List */}
      <div className="max-h-[420px] overflow-y-auto p-2 scroll-thin">
        {notificationsData.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-zinc-500 text-sm">
            No notifications
          </div>
        ) : (
          notificationsData.map((notification) => {
            const def = getNotificationIcon(notification.reference_prefix);
            const isFollow = notification.reference_prefix === "follow";
            const follower = isFollow ? getFollower(notification.message) : null;
            const followerName = follower?.name ?? null;
            const avatarUrl = isFollow ? avatars[notification.reference_id] : null;

            return (
              <button
                key={notification.notification_id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full flex items-start gap-3 rounded-xl border p-3 mb-2 text-left transition hover:bg-gray-50 dark:hover:bg-white/5 ${
                  notification.is_read
                    ? "border-transparent opacity-70"
                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold tracking-wider uppercase ${def.text}`}>
                      {getNotificationLabel(notification.reference_prefix)}
                    </span>
                    <span className="ml-auto text-[10px] text-gray-500 dark:text-zinc-500 whitespace-nowrap">
                      {formatTimeAgo(notification.created_at)}
                    </span>
                  </div>

                  {followerName ? (
                    <>
                      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white truncate">
                        {followerName}
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        started following you
                      </p>
                    </>
                  ) : (
                    <p className={`mt-1 text-sm line-clamp-2 ${
                      notification.is_read
                        ? "text-gray-600 dark:text-zinc-400"
                        : "text-gray-900 dark:text-white font-medium"
                    }`}>
                      {notification.message}
                    </p>
                  )}
                </div>

                <div className="relative flex-shrink-0 pt-0.5">
                  {isFollow ? (
                    <AccountAvatar url={avatarUrl} name={followerName} />
                  ) : (
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 ${def.text}`}>
                      {def.icon}
                    </div>
                  )}
                  {!notification.is_read && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-dark-surface" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-white/10 p-3 flex gap-2">
        <button
          onClick={() => {
            onClose();
            navigate("/notifications");
          }}
          className="flex-1 py-1.5 rounded-lg text-center text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition"
        >
          Open Full View
        </button>
        {notificationsData.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex-1 py-1.5 rounded-lg text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 transition"
          >
            Mark all as read
          </button>
        )}
      </div>
    </div>
  );
};

export default UserNotificationModal;
