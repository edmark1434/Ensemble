import { create } from "zustand";
import { useMemo } from "react";
import api from "@/lib/axios";
import socket from "@/lib/socket";

export interface SharedNotification {
  notification_id: string;
  message: string;
  is_read: boolean;
  reference_table: string;
  reference_prefix: string;
  reference_path: string;
  reference_id: string;
  account_id?: string;
  created_at: string;
  deleted_at?: string | null;
  [key: string]: any;
}

export type NavBadgeRoute =
  | "/projects"
  | "/teams"
  | "/forums"
  | "/assets"
  | "/dashboard"
  | "/workspaces"
  | "/inbox"
  | "/contracts";

interface NotificationStoreState {
  notifications: SharedNotification[];
  hasFetchedOnce: boolean;
  setNotifications: (
    updater:
      | SharedNotification[]
      | ((prev: SharedNotification[]) => SharedNotification[])
  ) => void;
  markIdsAsRead: (ids: string[]) => void;
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  notifications: [],
  hasFetchedOnce: false,
  setNotifications: (updater) =>
    set((state) => ({
      notifications:
        typeof updater === "function" ? updater(state.notifications) : updater,
      hasFetchedOnce: true,
    })),
  markIdsAsRead: (ids) => {
    if (!ids.length) return;
    const idSet = new Set(ids);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        idSet.has(n.notification_id) ? { ...n, is_read: true } : n
      ),
    }));
  },
}));

const PROJECT_PREFIXES = new Set(["PROJECT_INVITATION"]);

const TEAM_PREFIXES = new Set([
  "TEAM_INVITATION",
  "TEAM_JOIN_APPROVED",
  "TEAM_FUND_TRANSFER",
]);

const FORUM_PREFIXES = new Set([
  "FORUM_COMMENT",
  "FORUM_REPLY",
  "FORUM_LIKE",
  "FORUM_SAVE",
  "FORUM_MENTION",
]);

const ASSET_PREFIXES = new Set(["ASSET_PURCHASED", "ASSET_CLAIMED"]);

const DASHBOARD_PREFIXES = new Set([
  "MILESTONE_UPDATE",
  "MILESTONE_MESSAGE",
  "MILESTONE_REVIEW_REQUESTED",
  "MILESTONE_REVISION_REQUESTED",
  "MILESTONE_DUE_SOON",
  "MILESTONE_OVERDUE",
  "MILESTONE_STALLED",
  "MILESTONE_ABANDONED",
  "MILESTONE_APPROVED",
  "MILESTONE_AUTO_APPROVED",
  "MILESTONE_REVISION",
  "MILESTONE_REVIEW_REMINDER",
  "MILESTONE_CANCELLED",
  "MILESTONE_FUNDS_RELEASED",
  "MILESTONE_REVISION_PURCHASED",
]);

const WORKSPACE_PREFIXES = new Set([
  "TEAM_TASK_ASSIGNED",
  "TEAM_TASK_STATUS_CHANGED",
  "TEAM_TASK_DUE",
]);

const INBOX_PREFIXES = new Set([
  "CHAT_GROUP_ADDED",
  "CHAT_ENGAGEMENT_CREATED",
  "CHAT_MARKETPLACE_CREATED",
  "CHAT_REVISION_CREATED",
  "CHAT_MESSAGE",
  "CHAT_REPLY",
  "CHAT_REACTION",
  "meeting_request",
]);

const CONTRACT_PREFIXES = new Set([
  "offer_sent",
  "offer_received",
  "offer_accepted",
  "CON",
  "CONTRACT_REVIEW",
  "CONTRACT_CLOSED",
  "CONTRACT_CANCELLED",
  "CONTRACT_EXTENDED",
  "CONTRACT_FUND_DISTRIBUTION",
  "CANCELLATION_REQUESTED",
  "CANCELLATION_ACCEPTED",
  "CANCELLATION_DECLINED",
  "CANCELLATION_WITHDRAWN",
  "CANCELLATION_AUTO_APPROVED",
]);

export function getNavSectionForNotification(
  n: Pick<SharedNotification, "reference_prefix" | "reference_path" | "reference_table">
): NavBadgeRoute | null {
  const prefix = String(n.reference_prefix || "").trim();
  const path = String(n.reference_path || "").trim();
  const table = String(n.reference_table || "").trim().toLowerCase();

  // 1. Check explicit prefix mappings first
  if (PROJECT_PREFIXES.has(prefix)) return "/projects";
  if (FORUM_PREFIXES.has(prefix)) return "/forums";
  if (ASSET_PREFIXES.has(prefix)) return "/assets";
  if (DASHBOARD_PREFIXES.has(prefix)) return "/dashboard";
  if (WORKSPACE_PREFIXES.has(prefix)) return "/workspaces";
  if (INBOX_PREFIXES.has(prefix)) return "/inbox";
  if (CONTRACT_PREFIXES.has(prefix)) return "/contracts";
  if (TEAM_PREFIXES.has(prefix)) return "/teams";

  // 2. Fallback to reference_path inspection
  if (
    path.startsWith("/workspaces") ||
    path.startsWith("/team-project") ||
    /^\/teams\/[^/]+\/(projects|tasks)(\/|$|\?)/.test(path) ||
    (path.startsWith("/teams") && path.includes("tab=projects"))
  ) {
    return "/workspaces";
  }
  if (path.startsWith("/projects") || path.startsWith("/project/")) {
    return "/projects";
  }
  if (path.startsWith("/teams")) {
    return "/teams";
  }
  if (path.startsWith("/forums") || path.startsWith("/forum")) {
    return "/forums";
  }
  if (path.startsWith("/assets") || path.startsWith("/asset")) {
    return "/assets";
  }
  if (path.startsWith("/dashboard")) {
    return "/dashboard";
  }
  if (path.startsWith("/inbox")) {
    return "/inbox";
  }
  if (path.startsWith("/contracts") || path.includes("/offer/")) {
    return "/contracts";
  }

  // 3. Fallback to reference_table
  if (table === "projects") return "/projects";
  if (table === "teams") return "/teams";
  if (table === "forums" || table === "forum_posts") return "/forums";
  if (table === "assets") return "/assets";
  if (table === "milestones") return "/dashboard";
  if (table === "contracts") return "/contracts";

  return null;
}

export function getActiveNavBadgeRoute(
  pathname: string,
  search = ""
): NavBadgeRoute | null {
  if (
    pathname.startsWith("/workspaces") ||
    pathname.startsWith("/team-project") ||
    /^\/teams\/[^/]+\/(projects|tasks)(\/|$)/.test(pathname) ||
    (pathname === "/teams" && search.includes("tab=projects"))
  ) {
    return "/workspaces";
  }
  if (pathname.startsWith("/projects") || pathname.startsWith("/project/")) {
    return "/projects";
  }
  if (pathname.startsWith("/teams")) {
    return "/teams";
  }
  if (pathname.startsWith("/forums") || pathname.startsWith("/forum")) {
    return "/forums";
  }
  if (pathname.startsWith("/assets") || pathname.startsWith("/asset")) {
    return "/assets";
  }
  if (pathname.startsWith("/dashboard")) {
    return "/dashboard";
  }
  if (pathname.startsWith("/inbox")) {
    return "/inbox";
  }
  if (pathname.startsWith("/contracts")) {
    return "/contracts";
  }
  return null;
}

const inFlightReadIds = new Set<string>();

export async function markSectionNotificationsAsRead(
  section: NavBadgeRoute
): Promise<void> {
  const { notifications, markIdsAsRead } = useNotificationStore.getState();
  const unreadForSection = notifications.filter(
    (n) =>
      !n.is_read &&
      n.notification_id &&
      !inFlightReadIds.has(n.notification_id) &&
      getNavSectionForNotification(n) === section
  );

  if (unreadForSection.length === 0) return;

  const ids = unreadForSection.map((n) => n.notification_id);
  ids.forEach((id) => inFlightReadIds.add(id));
  markIdsAsRead(ids);

  await Promise.allSettled(
    ids.map(async (id) => {
      try {
        await api.patch(`/api/notifications/${id}/read`);
        if (socket.connected) {
          socket.emit("markMessageAsRead", id);
        }
      } catch {
        // Ignore individual failure; next fetch will reconcile
      } finally {
        inFlightReadIds.delete(id);
      }
    })
  );
}

export function useNavNotificationCounts(): Record<NavBadgeRoute, number> {
  const notifications = useNotificationStore((state) => state.notifications);

  return useMemo(() => {
    const counts: Record<NavBadgeRoute, number> = {
      "/projects": 0,
      "/teams": 0,
      "/forums": 0,
      "/assets": 0,
      "/dashboard": 0,
      "/workspaces": 0,
      "/inbox": 0,
      "/contracts": 0,
    };

    for (const n of notifications) {
      if (n.is_read) continue;
      const section = getNavSectionForNotification(n);
      if (section) {
        counts[section] += 1;
      }
    }

    return counts;
  }, [notifications]);
}
