import React, { useEffect, useState, useCallback } from "react";
import {
  Bell, CheckCheck, InboxIcon, Users, Activity, CreditCard, Shield,
  MessageSquare, Briefcase, FileText, Star, AlertCircle, UserPlus,
  TrendingUp, Wallet, BadgeCheck, Ticket, RefreshCw, Heart,
  BookOpen, AtSign, Calendar, Clock, XCircle, CheckCircle2,
  ArrowRightLeft, Package, Layers,
} from "lucide-react";
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

// ─── Classification maps ───────────────────────────────────────────────────
const FOLLOWER_PREFIXES = new Set(["follow"]);
const TRANSACTION_PREFIXES = new Set([
  "TOPUP", "SUBSCRIPTION",
  "CASHOUT_PENDING", "CASHOUT_APPROVED", "CASHOUT_REJECTED", "CASHOUT_COMPLETED",
  "CONTRACT_FUND_DISTRIBUTION",
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

// ─── Icon + colour per prefix ──────────────────────────────────────────────
type IconDef = { icon: React.ReactNode; bg: string; text: string };

const PREFIX_ICON: Record<string, IconDef> = {
  // Followers
  follow:                    { icon: <UserPlus className="w-4 h-4" />,       bg: "bg-pink-500/10",    text: "text-pink-500" },
  // Chat
  CHAT_GROUP_ADDED:          { icon: <Users className="w-4 h-4" />,          bg: "bg-purple-500/10",  text: "text-purple-500" },
  CHAT_ENGAGEMENT_CREATED:   { icon: <MessageSquare className="w-4 h-4" />,  bg: "bg-purple-500/10",  text: "text-purple-500" },
  CHAT_MARKETPLACE_CREATED:  { icon: <MessageSquare className="w-4 h-4" />,  bg: "bg-purple-500/10",  text: "text-purple-500" },
  CHAT_REVISION_CREATED:     { icon: <RefreshCw className="w-4 h-4" />,      bg: "bg-yellow-500/10",  text: "text-yellow-500" },
  CHAT_REPLY:                { icon: <MessageSquare className="w-4 h-4" />,  bg: "bg-purple-500/10",  text: "text-purple-500" },
  CHAT_REACTION:             { icon: <Heart className="w-4 h-4" />,          bg: "bg-rose-500/10",    text: "text-rose-500" },
  // Jobs
  create:                    { icon: <Briefcase className="w-4 h-4" />,      bg: "bg-blue-500/10",    text: "text-blue-500" },
  save:                      { icon: <BookOpen className="w-4 h-4" />,       bg: "bg-blue-500/10",    text: "text-blue-500" },
  shortlisted:               { icon: <Star className="w-4 h-4" />,           bg: "bg-amber-500/10",   text: "text-amber-500" },
  unshortlisted:             { icon: <XCircle className="w-4 h-4" />,        bg: "bg-gray-500/10",    text: "text-gray-500" },
  accepted:                  { icon: <CheckCircle2 className="w-4 h-4" />,   bg: "bg-green-500/10",   text: "text-green-500" },
  rejected:                  { icon: <XCircle className="w-4 h-4" />,        bg: "bg-red-500/10",     text: "text-red-500" },
  // Gigs
  new_order:                 { icon: <Package className="w-4 h-4" />,        bg: "bg-blue-500/10",    text: "text-blue-500" },
  GIGR:                      { icon: <Star className="w-4 h-4" />,           bg: "bg-amber-500/10",   text: "text-amber-500" },
  // Contracts
  offer_sent:                { icon: <FileText className="w-4 h-4" />,       bg: "bg-indigo-500/10",  text: "text-indigo-500" },
  offer_received:            { icon: <FileText className="w-4 h-4" />,       bg: "bg-indigo-500/10",  text: "text-indigo-500" },
  offer_accepted:            { icon: <CheckCircle2 className="w-4 h-4" />,   bg: "bg-green-500/10",   text: "text-green-500" },
  CON:                       { icon: <FileText className="w-4 h-4" />,       bg: "bg-indigo-500/10",  text: "text-indigo-500" },
  JOB:                       { icon: <Briefcase className="w-4 h-4" />,      bg: "bg-blue-500/10",    text: "text-blue-500" },
  PRP:                       { icon: <FileText className="w-4 h-4" />,       bg: "bg-indigo-500/10",  text: "text-indigo-500" },
  CONTRACT_REVIEW:           { icon: <FileText className="w-4 h-4" />,       bg: "bg-indigo-500/10",  text: "text-indigo-500" },
  CONTRACT_CLOSED:           { icon: <XCircle className="w-4 h-4" />,        bg: "bg-gray-500/10",    text: "text-gray-500" },
  CONTRACT_CANCELLED:        { icon: <XCircle className="w-4 h-4" />,        bg: "bg-red-500/10",     text: "text-red-500" },
  CONTRACT_EXTENDED:         { icon: <Calendar className="w-4 h-4" />,       bg: "bg-teal-500/10",    text: "text-teal-500" },
  CONTRACT_FUND_DISTRIBUTION:{ icon: <ArrowRightLeft className="w-4 h-4" />, bg: "bg-emerald-500/10", text: "text-emerald-500" },
  // Milestones
  MILESTONE_DUE_SOON:        { icon: <Clock className="w-4 h-4" />,          bg: "bg-orange-500/10",  text: "text-orange-500" },
  MILESTONE_OVERDUE:         { icon: <AlertCircle className="w-4 h-4" />,    bg: "bg-red-500/10",     text: "text-red-500" },
  MILESTONE_STALLED:         { icon: <AlertCircle className="w-4 h-4" />,    bg: "bg-red-500/10",     text: "text-red-500" },
  MILESTONE_ABANDONED:       { icon: <XCircle className="w-4 h-4" />,        bg: "bg-red-500/10",     text: "text-red-500" },
  MILESTONE_APPROVED:        { icon: <CheckCircle2 className="w-4 h-4" />,   bg: "bg-green-500/10",   text: "text-green-500" },
  MILESTONE_AUTO_APPROVED:   { icon: <CheckCircle2 className="w-4 h-4" />,   bg: "bg-green-500/10",   text: "text-green-500" },
  MILESTONE_REVISION:        { icon: <RefreshCw className="w-4 h-4" />,      bg: "bg-yellow-500/10",  text: "text-yellow-500" },
  MILESTONE_REVIEW_REMINDER: { icon: <Clock className="w-4 h-4" />,          bg: "bg-orange-500/10",  text: "text-orange-500" },
  MILESTONE_CANCELLED:       { icon: <XCircle className="w-4 h-4" />,        bg: "bg-red-500/10",     text: "text-red-500" },
  // Cancellations
  CANCELLATION_REQUESTED:    { icon: <AlertCircle className="w-4 h-4" />,    bg: "bg-orange-500/10",  text: "text-orange-500" },
  CANCELLATION_ACCEPTED:     { icon: <CheckCircle2 className="w-4 h-4" />,   bg: "bg-green-500/10",   text: "text-green-500" },
  CANCELLATION_DECLINED:     { icon: <XCircle className="w-4 h-4" />,        bg: "bg-red-500/10",     text: "text-red-500" },
  CANCELLATION_WITHDRAWN:    { icon: <RefreshCw className="w-4 h-4" />,      bg: "bg-gray-500/10",    text: "text-gray-500" },
  CANCELLATION_AUTO_APPROVED:{ icon: <CheckCircle2 className="w-4 h-4" />,   bg: "bg-green-500/10",   text: "text-green-500" },
  // Payments
  TOPUP:                     { icon: <Wallet className="w-4 h-4" />,         bg: "bg-emerald-500/10", text: "text-emerald-500" },
  SUBSCRIPTION:              { icon: <Layers className="w-4 h-4" />,         bg: "bg-violet-500/10",  text: "text-violet-500" },
  CASHOUT_PENDING:           { icon: <ArrowRightLeft className="w-4 h-4" />, bg: "bg-yellow-500/10",  text: "text-yellow-500" },
  CASHOUT_APPROVED:          { icon: <CheckCircle2 className="w-4 h-4" />,   bg: "bg-green-500/10",   text: "text-green-500" },
  CASHOUT_REJECTED:          { icon: <XCircle className="w-4 h-4" />,        bg: "bg-red-500/10",     text: "text-red-500" },
  CASHOUT_COMPLETED:         { icon: <CheckCircle2 className="w-4 h-4" />,   bg: "bg-green-500/10",   text: "text-green-500" },
  // Team tasks
  TEAM_TASK_ASSIGNED:        { icon: <Briefcase className="w-4 h-4" />,      bg: "bg-blue-500/10",    text: "text-blue-500" },
  TEAM_TASK_STATUS_CHANGED:  { icon: <RefreshCw className="w-4 h-4" />,      bg: "bg-teal-500/10",    text: "text-teal-500" },
  TEAM_TASK_DUE:             { icon: <Clock className="w-4 h-4" />,          bg: "bg-orange-500/10",  text: "text-orange-500" },
  // Social
  PROJECT_INVITATION:        { icon: <UserPlus className="w-4 h-4" />,       bg: "bg-pink-500/10",    text: "text-pink-500" },
  meeting_request:           { icon: <Calendar className="w-4 h-4" />,       bg: "bg-indigo-500/10",  text: "text-indigo-500" },
  // Forums
  FORUM_COMMENT:             { icon: <MessageSquare className="w-4 h-4" />,  bg: "bg-purple-500/10",  text: "text-purple-500" },
  FORUM_REPLY:               { icon: <MessageSquare className="w-4 h-4" />,  bg: "bg-purple-500/10",  text: "text-purple-500" },
  FORUM_LIKE:                { icon: <Heart className="w-4 h-4" />,          bg: "bg-rose-500/10",    text: "text-rose-500" },
  FORUM_SAVE:                { icon: <BookOpen className="w-4 h-4" />,       bg: "bg-blue-500/10",    text: "text-blue-500" },
  FORUM_MENTION:             { icon: <AtSign className="w-4 h-4" />,         bg: "bg-amber-500/10",   text: "text-amber-500" },
  // Account
  VERIFICATION:              { icon: <BadgeCheck className="w-4 h-4" />,     bg: "bg-green-500/10",   text: "text-green-500" },
  BUSINESS_VERIFICATION:     { icon: <BadgeCheck className="w-4 h-4" />,     bg: "bg-green-500/10",   text: "text-green-500" },
  IDENTITY_REVERIFICATION:   { icon: <AlertCircle className="w-4 h-4" />,    bg: "bg-orange-500/10",  text: "text-orange-500" },
  SUSPEND:                   { icon: <XCircle className="w-4 h-4" />,        bg: "bg-red-500/10",     text: "text-red-500" },
  // Tickets
  TICKET_ASSIGNED:           { icon: <Ticket className="w-4 h-4" />,         bg: "bg-indigo-500/10",  text: "text-indigo-500" },
  TICKET_RESOLVED:           { icon: <CheckCircle2 className="w-4 h-4" />,   bg: "bg-green-500/10",   text: "text-green-500" },
  TICKET_REPLY:              { icon: <Ticket className="w-4 h-4" />,         bg: "bg-indigo-500/10",  text: "text-indigo-500" },
  TICKET_INTERNAL_REPLY:     { icon: <Ticket className="w-4 h-4" />,         bg: "bg-gray-500/10",    text: "text-gray-500" },
};

const DEFAULT_ICON: IconDef = { icon: <Bell className="w-4 h-4" />, bg: "bg-gray-500/10", text: "text-gray-500" };

function getIconDef(prefix: string): IconDef {
  return PREFIX_ICON[prefix] ?? DEFAULT_ICON;
}

// ─── Human-readable label per prefix ──────────────────────────────────────
const PREFIX_LABEL: Record<string, string> = {
  follow: "New Follower", CHAT_GROUP_ADDED: "Added to Group",
  CHAT_ENGAGEMENT_CREATED: "Engagement Started", CHAT_MARKETPLACE_CREATED: "Marketplace Chat",
  CHAT_REVISION_CREATED: "Revision Chat", CHAT_REPLY: "Message Reply",
  CHAT_REACTION: "Reaction", create: "Job Posted", save: "Job Saved",
  shortlisted: "Shortlisted", unshortlisted: "Removed from Shortlist",
  accepted: "Proposal Accepted", rejected: "Proposal Rejected",
  new_order: "New Gig Order", GIGR: "Gig Review",
  offer_sent: "Offer Sent", offer_received: "Offer Received", offer_accepted: "Offer Accepted",
  CON: "Contract Event", JOB: "Job Contract", PRP: "Proposal Contract",
  CONTRACT_REVIEW: "Contract Review", CONTRACT_CLOSED: "Contract Closed",
  CONTRACT_CANCELLED: "Contract Cancelled", CONTRACT_EXTENDED: "Contract Extended",
  CONTRACT_FUND_DISTRIBUTION: "Funds Distributed",
  MILESTONE_DUE_SOON: "Milestone Due Soon", MILESTONE_OVERDUE: "Milestone Overdue",
  MILESTONE_STALLED: "Milestone Stalled", MILESTONE_ABANDONED: "Milestone Abandoned",
  MILESTONE_APPROVED: "Milestone Approved", MILESTONE_AUTO_APPROVED: "Auto-Approved",
  MILESTONE_REVISION: "Revision Requested", MILESTONE_REVIEW_REMINDER: "Review Reminder",
  MILESTONE_CANCELLED: "Milestone Cancelled",
  CANCELLATION_REQUESTED: "Cancellation Requested", CANCELLATION_ACCEPTED: "Cancellation Accepted",
  CANCELLATION_DECLINED: "Cancellation Declined", CANCELLATION_WITHDRAWN: "Cancellation Withdrawn",
  CANCELLATION_AUTO_APPROVED: "Auto-Approved Cancellation",
  TOPUP: "Credit Top-up", SUBSCRIPTION: "Subscription",
  CASHOUT_PENDING: "Cashout Pending", CASHOUT_APPROVED: "Cashout Approved",
  CASHOUT_REJECTED: "Cashout Rejected", CASHOUT_COMPLETED: "Cashout Completed",
  TEAM_TASK_ASSIGNED: "Task Assigned", TEAM_TASK_STATUS_CHANGED: "Task Updated",
  TEAM_TASK_DUE: "Task Due", PROJECT_INVITATION: "Project Invite",
  meeting_request: "Meeting Request", FORUM_COMMENT: "Forum Comment",
  FORUM_REPLY: "Forum Reply", FORUM_LIKE: "Forum Like",
  FORUM_SAVE: "Forum Save", FORUM_MENTION: "Mentioned",
  VERIFICATION: "Verified", BUSINESS_VERIFICATION: "Business Verified",
  IDENTITY_REVERIFICATION: "Re-verify Required", SUSPEND: "Account Suspended",
  TICKET_ASSIGNED: "Ticket Assigned", TICKET_RESOLVED: "Ticket Resolved",
  TICKET_REPLY: "Ticket Reply", TICKET_INTERNAL_REPLY: "Internal Reply",
};

// ─── Tabs ──────────────────────────────────────────────────────────────────
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "followers",     label: "Followers",     icon: <Users className="w-4 h-4" /> },
  { key: "activity",     label: "Activity",      icon: <Activity className="w-4 h-4" /> },
  { key: "transactions", label: "Transactions",  icon: <CreditCard className="w-4 h-4" /> },
  { key: "system",       label: "System",        icon: <Shield className="w-4 h-4" /> },
];

// ─── Follower avatar cache ─────────────────────────────────────────────────
function useAvatarCache() {
  const [cache, setCache] = useState<Record<string, string | null>>({});
  const fetch = useCallback(async (accountId: string) => {
    if (accountId in cache) return;
    try {
      const { data } = await api.get(`/api/accounts/profile/avatars/${accountId}`);
      const current = data?.avatars?.find((a: any) => a.is_current) ?? data?.avatars?.[0];
      setCache(prev => ({ ...prev, [accountId]: current?.url ?? null }));
    } catch {
      setCache(prev => ({ ...prev, [accountId]: null }));
    }
  }, [cache]);
  return { cache, fetch };
}

function NotificationAvatar({ accountId, avatarCache, fetchAvatar }: { accountId: string; avatarCache: Record<string, string | null>; fetchAvatar: (id: string) => void }) {
  useEffect(() => { fetchAvatar(accountId); }, [accountId]);
  const url = avatarCache[accountId];
  if (url) return <img src={url} alt="avatar" className="w-10 h-10 rounded-full object-cover border-2 border-pink-200 dark:border-pink-500/30 shrink-0" />;
  return (
    <div className="w-10 h-10 rounded-full bg-pink-500/10 border-2 border-pink-200 dark:border-pink-500/30 flex items-center justify-center shrink-0">
      <Users className="w-5 h-5 text-pink-500" />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("activity");
  const { cache: avatarCache, fetch: fetchAvatar } = useAvatarCache();

  useEffect(() => {
    fetchNotifications();
    const handler = (n: Notification) => setNotifications(prev => [n, ...prev]);
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
                    const isFollower = n.reference_prefix === "follow";
                    return (
                      <motion.li key={n.notification_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.035 }} className="group relative">
                        <button onClick={() => handleClick(n)} className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${!n.is_read ? "bg-blue-50/50 dark:bg-blue-500/[0.04]" : ""}`}>
                          {/* Unread bar */}
                          {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 rounded-r-full" />}

                          {/* Avatar (followers) or Icon */}
                          {isFollower ? (
                            <NotificationAvatar accountId={n.reference_id} avatarCache={avatarCache} fetchAvatar={fetchAvatar} />
                          ) : (
                            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border border-black/5 dark:border-white/5 ${def.bg} ${def.text}`}>
                              {def.icon}
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${!n.is_read ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-zinc-500"}`}>
                                {PREFIX_LABEL[n.reference_prefix] ?? n.reference_prefix}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-zinc-500 ml-auto whitespace-nowrap shrink-0">{fmt(n.created_at)}</span>
                            </div>
                            <p className={`text-sm leading-snug truncate ${!n.is_read ? "text-gray-900 dark:text-white font-semibold" : "text-gray-600 dark:text-zinc-300"}`}>
                              {n.message}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-600 mt-0.5 capitalize">{n.reference_table}</p>
                          </div>

                          {/* Unread dot */}
                          {!n.is_read && <div className="shrink-0 w-2 h-2 rounded-full bg-blue-500" />}
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
