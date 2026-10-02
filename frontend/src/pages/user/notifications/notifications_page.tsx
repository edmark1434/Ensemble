import React, { useEffect, useState } from "react";
import { Bell, CheckCheck, InboxIcon, Users, Activity, CreditCard, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import UserHeader from "@/components/nav/user_header";
import ShapeGrid from "@/components/ui/ShapeGrid";

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

type TabKey = "followers" | "activity" | "transactions" | "system";

const FOLLOWER_PREFIXES = new Set(["follow"]);
const TRANSACTION_PREFIXES = new Set([
  "TOPUP", "SUBSCRIPTION", "CASHOUT_PENDING", "CASHOUT_APPROVED",
  "CASHOUT_REJECTED", "CASHOUT_COMPLETED", "CONTRACT_FUND_DISTRIBUTION",
]);
const SYSTEM_PREFIXES = new Set([
  "VERIFICATION", "BUSINESS_VERIFICATION", "IDENTITY_REVERIFICATION", "SUSPEND",
  "TICKET_ASSIGNED", "TICKET_RESOLVED", "TICKET_REPLY", "TICKET_INTERNAL_REPLY",
]);

function classifyNotification(prefix: string): TabKey {
  if (FOLLOWER_PREFIXES.has(prefix)) return "followers";
  if (TRANSACTION_PREFIXES.has(prefix)) return "transactions";
  if (SYSTEM_PREFIXES.has(prefix)) return "system";
  return "activity";
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode; description: string }[] = [
  { key: "followers",    label: "Recent Followers",    icon: <Users className="w-4 h-4" />,      description: "People who started following you." },
  { key: "activity",    label: "Recent Activity",     icon: <Activity className="w-4 h-4" />,   description: "Jobs, gigs, contracts, milestones, and messages." },
  { key: "transactions", label: "Recent Transactions", icon: <CreditCard className="w-4 h-4" />, description: "Payments, cashouts, and subscriptions." },
  { key: "system",      label: "System Notifications", icon: <Shield className="w-4 h-4" />,    description: "Account, verification, and support updates." },
];

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("activity");

  useEffect(() => {
    fetchNotifications();
    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };
    if (socket.connected) socket.on("notification", handleNewNotification);
    return () => { if (socket.connected) socket.off("notification", handleNewNotification); };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/notifications/");
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await api.patch(`/api/notifications/${notification.notification_id}/read`);
        setNotifications((prev) =>
          prev.map((item) =>
            item.notification_id === notification.notification_id ? { ...item, is_read: true } : item
          )
        );
        if (socket.connected) socket.emit("markMessageAsRead", notification.notification_id);
      } catch (error) {
        console.error("Failed to mark notification as read", error);
        return;
      }
    }

    const referencePath = notification.reference_path || "";
    const directConversationMatch = referencePath.match(/^\/inbox\/(?!direct(?:\/|$)|marketplace(?:\/|$))([^/?#]+)/);
    const queryIndex = referencePath.indexOf("?");
    const conversationId =
      new URLSearchParams(queryIndex >= 0 ? referencePath.slice(queryIndex + 1) : "").get("conversation") || directConversationMatch?.[1];

    if (conversationId) { navigate("/inbox/direct", { state: { conversationId } }); return; }
    if (notification.reference_prefix === "TOPUP" || notification.reference_prefix === "PROJECT_INVITATION" || /^https?:\/\//i.test(referencePath)) {
      window.location.href = referencePath; return;
    }
    navigate(referencePath);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/api/notifications/read-all");
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      if (socket.connected) socket.emit("markAllNotificationsAsRead");
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const tabCounts = React.useMemo(() => {
    const counts: Record<TabKey, number> = { followers: 0, activity: 0, transactions: 0, system: 0 };
    notifications.filter(n => !n.is_read).forEach(n => { counts[classifyNotification(n.reference_prefix)]++; });
    return counts;
  }, [notifications]);

  const filteredNotifications = notifications.filter(n => classifyNotification(n.reference_prefix) === activeTab);
  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid shape="square" squareSize={48} direction="diagonal" speed={0.4} borderColor="rgba(150, 150, 150, 0.15)" hoverFillColor="rgba(59, 130, 246, 0.15)" hoverTrailAmount={3} />
      </div>

      <div className="relative z-20">
        <UserHeader pageTitle="Notifications" />
      </div>

      <div className="relative z-10 pt-6 pb-20 md:pt-10 flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Bell className="w-6 h-6" />
                </div>
                Your Notifications
              </h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
                Stay updated with your latest alerts, messages, and job updates.
              </p>
            </div>
            {hasUnread && (
              <button onClick={handleMarkAllRead} className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition text-sm font-semibold shadow-sm">
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl mb-4 shadow-sm">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                      : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tabCounts[tab.key] > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                      isActive ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}>
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab description */}
          <p className="text-xs text-gray-400 dark:text-zinc-500 mb-4 px-1">
            {TABS.find(t => t.key === activeTab)?.description}
          </p>

          {/* Content */}
          <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-zinc-500">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 border border-gray-200 dark:border-white/10">
                  <InboxIcon className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No notifications here</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Nothing in this category yet. When relevant updates arrive, they'll appear here.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.ul
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="divide-y divide-gray-100 dark:divide-white/5"
                >
                  {filteredNotifications.map((notification, idx) => (
                    <motion.li
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      key={notification.notification_id}
                      className="group relative"
                    >
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full flex items-start gap-4 p-5 text-left transition hover:bg-gray-50 dark:hover:bg-white/5 ${
                          !notification.is_read ? "bg-blue-50/50 dark:bg-blue-500/[0.03]" : ""
                        }`}
                      >
                        {!notification.is_read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className={`text-xs font-bold uppercase tracking-wider ${
                              !notification.is_read ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-zinc-400"
                            }`}>
                              {notification.reference_prefix}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-zinc-500 whitespace-nowrap font-medium">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                          <p className={`text-sm md:text-base leading-relaxed ${
                            !notification.is_read ? "text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-zinc-300"
                          }`}>
                            {notification.message}
                          </p>
                          <div className="mt-2 text-[11px] text-gray-400 dark:text-zinc-500">
                            {notification.reference_table}
                          </div>
                        </div>
                        {!notification.is_read && (
                          <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </button>
                    </motion.li>
                  ))}
                </motion.ul>
              </AnimatePresence>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
