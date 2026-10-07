import React, { useEffect, useState } from "react";
import { Bell, CheckCheck, InboxIcon, Users, Activity, CreditCard, Shield } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/axios";
import { getFollower, getNotificationIcon, getNotificationLabel } from "@/lib/notificationTypes";
import { useAccountAvatars } from "@/lib/accountAvatars";
import AccountAvatar from "@/components/ui/AccountAvatar";
import socket from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import UserHeader from "@/components/nav/user_header";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { badgesRegistry } from "@/pages/user/7_profile/Utilities/BadgesRegistry";

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

// ─── Classification maps ───────────────────────────────────────────────────
const FOLLOWER_PREFIXES = new Set(["follow"]);
const TRANSACTION_PREFIXES = new Set([
  "TOPUP", "SUBSCRIPTION",
  "CASHOUT_PENDING", "CASHOUT_APPROVED", "CASHOUT_REJECTED", "CASHOUT_COMPLETED",
  "CONTRACT_FUND_DISTRIBUTION", "PAYMENT", "TEAM_FUND_TRANSFER",
  "ASSET_PURCHASED", "ASSET_CLAIMED",
]);
const SYSTEM_PREFIXES = new Set([
  "VERIFICATION", "BUSINESS_VERIFICATION", "IDENTITY_REVERIFICATION", "SUSPEND", "MARKETPLACE",
  "TICKET_ASSIGNED", "TICKET_RESOLVED", "TICKET_REPLY", "TICKET_INTERNAL_REPLY",
  "BADGE_GRANTED",
]);

interface BadgeGrant {
  account_badge_id: string;
  status: "pending" | "claimed";
  registry_id: string;
  name: string;
}

const badgeMetaById = new Map(badgesRegistry.map(b => [String(b.id), b]));

function classifyNotification(prefix: string): TabKey {
  if (FOLLOWER_PREFIXES.has(prefix)) return "followers";
  if (TRANSACTION_PREFIXES.has(prefix)) return "transactions";
  if (SYSTEM_PREFIXES.has(prefix)) return "system";
  return "activity";
}

const getIconDef = getNotificationIcon;

// ─── Tabs ──────────────────────────────────────────────────────────────────
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "followers",     label: "Followers",     icon: <Users className="w-4 h-4" /> },
  { key: "activity",     label: "Activity",      icon: <Activity className="w-4 h-4" /> },
  { key: "transactions", label: "Transactions",  icon: <CreditCard className="w-4 h-4" /> },
  { key: "system",       label: "System",        icon: <Shield className="w-4 h-4" /> },
];

// ─── Main Component ────────────────────────────────────────────────────────
const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<TabKey>(
    TABS.some(t => t.key === tabParam) ? (tabParam as TabKey) : "activity"
  );
  useEffect(() => {
    if (TABS.some(t => t.key === tabParam)) setActiveTab(tabParam as TabKey);
  }, [tabParam]);
  const avatars = useAccountAvatars(
    notifications.filter(n => n.reference_prefix === "follow").map(n => n.reference_id)
  );

  const [badgeGrants, setBadgeGrants] = useState<Record<string, BadgeGrant>>({});
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchBadgeGrants = async () => {
    try {
      const { data } = await api.get("/api/accounts/badges/mine");
      const rows: BadgeGrant[] = data?.data || [];
      setBadgeGrants(Object.fromEntries(rows.map(g => [g.account_badge_id, g])));
    } catch { /* badge state is optional for rendering */ }
  };

  const handleClaim = async (n: Notification) => {
    setClaimingId(n.reference_id);
    try {
      await api.post(`/api/accounts/badges/${n.reference_id}/claim`);
      setBadgeGrants(prev => prev[n.reference_id] ? { ...prev, [n.reference_id]: { ...prev[n.reference_id], status: "claimed" } } : prev);
      if (!n.is_read) {
        await api.patch(`/api/notifications/${n.notification_id}/read`).catch(() => {});
        setNotifications(prev => prev.map(item => item.notification_id === n.notification_id ? { ...item, is_read: true } : item));
      }
    } catch {
      await fetchBadgeGrants();
    } finally {
      setClaimingId(null);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchBadgeGrants();
    const handler = (n: Notification) => {
      setNotifications(prev => [n, ...prev]);
      if (n.reference_prefix === "BADGE_GRANTED") fetchBadgeGrants();
    };
    if (socket.connected) socket.on("notification", handler);
    return () => { if (socket.connected) socket.off("notification", handler); };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/notifications/");
      setNotifications(data.notifications || []);
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await api.patch(`/api/notifications/${n.notification_id}/read`);
        setNotifications(prev => prev.map(item => item.notification_id === n.notification_id ? { ...item, is_read: true } : item));
        if (socket.connected) socket.emit("markMessageAsRead", n.notification_id);
      } catch { return; }
    }
    const path = n.reference_path || "";
    const convMatch = path.match(/^\/inbox\/(?!direct(?:\/|$)|marketplace(?:\/|$))([^/?#]+)/);
    const qi = path.indexOf("?");
    const convId = new URLSearchParams(qi >= 0 ? path.slice(qi + 1) : "").get("conversation") || convMatch?.[1];
    if (convId) { navigate("/inbox/direct", { state: { conversationId: convId } }); return; }
    if (n.reference_prefix === "TOPUP" || n.reference_prefix === "PROJECT_INVITATION" || /^https?:\/\//i.test(path)) { window.location.href = path; return; }
    navigate(path);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/api/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      if (socket.connected) socket.emit("markAllNotificationsAsRead");
    } catch (e) { console.error(e); }
  };

  const fmt = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const tabCounts = React.useMemo(() => {
    const c: Record<TabKey, number> = { followers: 0, activity: 0, transactions: 0, system: 0 };
    notifications.filter(n => !n.is_read).forEach(n => c[classifyNotification(n.reference_prefix)]++);
    return c;
  }, [notifications]);

  const filtered = notifications.filter(n => classifyNotification(n.reference_prefix) === activeTab);
  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid shape="square" squareSize={48} direction="diagonal" speed={0.4} borderColor="rgba(150,150,150,0.15)" hoverFillColor="rgba(59,130,246,0.15)" hoverTrailAmount={3} />
      </div>
      <div className="relative z-20"><UserHeader pageTitle="Notifications" /></div>

      <div className="relative z-10 pt-6 pb-20 md:pt-10 flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Bell className="w-6 h-6" />
                </div>
                Your Notifications
              </h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1.5">Stay updated with your latest alerts, messages, and job updates.</p>
            </div>
            {hasUnread && (
              <button onClick={handleMarkAllRead} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition text-sm font-semibold shadow-sm">
                <CheckCheck className="w-4 h-4" /> Mark all as read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 p-1.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl mb-5 shadow-sm">
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`relative flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    active ? "bg-blue-500 text-white shadow-md shadow-blue-500/25" : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tabCounts[tab.key] > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                      active ? "bg-white/25 text-white" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}>{tabCounts[tab.key]}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notification list */}
          <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-zinc-500">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium">Loading notifications...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 border border-gray-200 dark:border-white/10">
                  <InboxIcon className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nothing here yet</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xs mx-auto">When relevant updates arrive they'll appear in this tab.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.ul key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="divide-y divide-gray-100 dark:divide-white/5">
                  {filtered.map((n, idx) => {
                    const def = getIconDef(n.reference_prefix);
                    const follower = n.reference_prefix === "follow" ? getFollower(n.message) : null;
                    const isFollower = n.reference_prefix === "follow";
                    if (n.reference_prefix === "BADGE_GRANTED") {
                      const grant = badgeGrants[n.reference_id];
                      const meta = grant ? badgeMetaById.get(grant.registry_id) : undefined;
                      return (
                        <motion.li key={n.notification_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.035 }} className="flex items-center gap-4 px-5 py-4">
                          <div className="relative shrink-0">
                            {meta?.icon ? (
                              <img src={meta.icon} alt="" className="h-11 w-11 object-contain" />
                            ) : (
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 ${def.text}`}>{def.icon}</div>
                            )}
                            {!n.is_read && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white dark:ring-dark-surface" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                              {getNotificationLabel(n.reference_prefix)}{grant ? ` · ${meta?.name || grant.name}` : ""}
                            </span>
                            <p className={`text-sm leading-snug line-clamp-3 ${!n.is_read ? "text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-zinc-400"}`}>{n.message}</p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 whitespace-nowrap">{fmt(n.created_at)}</span>
                            {grant?.status === "pending" ? (
                              <button
                                onClick={() => handleClaim(n)}
                                disabled={claimingId === n.reference_id}
                                className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition disabled:opacity-60"
                              >
                                {claimingId === n.reference_id ? "Claiming…" : "Claim"}
                              </button>
                            ) : grant?.status === "claimed" ? (
                              <button onClick={() => navigate("/profile")} className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
                                Claimed · View on profile
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-zinc-500">No longer available</span>
                            )}
                          </div>
                        </motion.li>
                      );
                    }
                    return (
                      <motion.li key={n.notification_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.035 }} className="group relative">
                        <button onClick={() => handleClick(n)} className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                          {/* Avatar (followers) or Icon */}
                          <div className="relative shrink-0">
                            {isFollower ? (
                              <AccountAvatar url={avatars[n.reference_id]} name={follower?.name} className="h-11 w-11" />
                            ) : (
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center bg-gray-100 dark:bg-white/5 ${def.text}`}>
                                {def.icon}
                              </div>
                            )}
                            {!n.is_read && (
                              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 ring-2 ring-white dark:ring-dark-surface" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {isFollower && follower ? (
                              <>
                                <p className="text-sm text-gray-900 dark:text-white truncate">
                                  <span className="font-semibold">{follower.name}</span>
                                  {follower.handle && <span className="ml-1.5 text-gray-500 dark:text-zinc-500">@{follower.handle}</span>}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-zinc-400">started following you</p>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                                  {getNotificationLabel(n.reference_prefix)}
                                </span>
                                <p className={`text-sm leading-snug line-clamp-2 ${!n.is_read ? "text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-zinc-400"}`}>
                                  {n.message}
                                </p>
                              </>
                            )}
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <span className="text-[11px] text-gray-400 dark:text-zinc-500 whitespace-nowrap">{fmt(n.created_at)}</span>
                            {isFollower && (
                              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">View profile</span>
                            )}
                          </div>
                        </button>
                      </motion.li>
                    );
                  })}
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
