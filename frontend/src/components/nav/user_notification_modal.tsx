import React from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import socket from "@/lib/socket";

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

  const handleNotificationClick = (notification: Notification) => {
    // Optimistic update
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.notification_id === notification.notification_id
            ? { ...item, is_read: true }
            : item
        )
      );

      socket.emit("markMessageAsRead", notification.notification_id);
    }

    onClose();
    window.location.href = notification.reference_path;
  };

  const handleMarkAllRead = () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        is_read: true,
      }))
    );

    socket.emit("markAllNotificationsAsRead");
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
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-white/10 bg-[#0d0f1a] shadow-2xl backdrop-blur-xl overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <h3 className="text-sm font-semibold text-white">
          Notifications
        </h3>

        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Notification List */}
      <div className="max-h-[420px] overflow-y-auto p-2">
        {notificationsData.length === 0 ? (
          <div className="py-10 text-center text-zinc-500 text-sm">
            No notifications
          </div>
        ) : (
          notificationsData.map((notification) => (
            <button
              key={notification.notification_id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full rounded-lg p-3 mb-2 text-left transition ${
                notification.is_read
                  ? "hover:bg-white/5"
                  : "bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`text-xs font-semibold ${
                    notification.is_read
                      ? "text-zinc-400"
                      : "text-blue-400"
                  }`}
                >
                  {notification.reference_prefix}
                </span>

                <span className="text-[10px] text-zinc-500">
                  {formatTimeAgo(notification.created_at)}
                </span>
              </div>

              <p className="mt-1 text-sm text-zinc-300">
                {notification.message}
              </p>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">
                  {notification.reference_table}
                </span>

                {!notification.is_read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      {notificationsData.length > 0 && (
        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleMarkAllRead}
            className="w-full text-center text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
};

export default UserNotificationModal;