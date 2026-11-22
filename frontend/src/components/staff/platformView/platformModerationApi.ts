import api from "@/lib/axios";
import type { CaseAccountSummary } from "@/pages/admin/ticketManagement/ticketTypes";
import type { WarningDesk } from "@/lib/warningCatalog";

/** Mirrors `backend/services/PlatformViewModerationServices.js`. */

export type AccountActionId = "warn" | "timeout" | "suspend" | "lock" | "ban";

export type ContentActionId =
  | "hide_comment"
  | "remove_discussion"
  | "lock_discussion"
  | "archive_group"
  | "delist_listing"
  | "rereview_listing"
  | "pause_posting"
  | "close_posting";

export type ActionRule = { allowed: boolean; reason: string | null; note: string | null };

export type ModerationAccount = {
  accountId: string;
  relation: string;
  missing: boolean;
  name: string;
  handle: string | null;
  type: string | null;
  isTeam: boolean;
  isStaff: boolean;
  staffRole?: string | null;
  summary: CaseAccountSummary | null;
  team: {
    name: string;
    leader: {
      accountId: string;
      name: string;
      handle: string | null;
      status: string;
      forumTimeout: boolean;
      forumTimeoutEndsAt: string | null;
    } | null;
    /** Active members (leader included), for "who else gets it". */
    members?: {
      accountId: string;
      name: string;
      handle: string | null;
      role: string;
      status: string;
      isLeader: boolean;
    }[];
  } | null;
  actions: Record<AccountActionId, ActionRule>;
};

export type ModerationSubject = {
  key: string;
  kind: string;
  kindLabel: string;
  area: "forum" | "marketplace" | "jobs" | "account" | "dispute" | "none";
  areaLabel: string | null;
  available: boolean;
  title: string;
  excerpt: string | null;
  href: string | null;
  status: string;
  statusLabel: string;
  createdAt: string | null;
  facts: { label: string; value: string }[];
  notes: string[];
  readOnly: string | null;
  inArea: boolean;
};

export type ModerationContentAction = {
  id: ContentActionId;
  label: string;
  hint: string;
  allowed: boolean;
  reason: string | null;
};

export type ModerationReport = {
  id: string;
  number: string | null;
  status: string;
  priority: string | null;
  type: string | null;
  targetType: string | null;
  accountId: string | null;
  onSubject: boolean;
  desk: "forum" | "marketplace" | "jobs" | "support";
  createdAt: string | null;
};

export type ModerationRecentAction = {
  id: string;
  accountId: string;
  eventCode: string;
  label: string;
  severity: string;
  action: string | null;
  reason: string | null;
  at: string | null;
  actor: { name: string; role: string };
  viaPlatformView: boolean;
  sameSubject: boolean;
};

export type ModerationViewer = {
  role: string | null;
  desk: WarningDesk | null;
  deskLabel: string;
  fullRole: boolean;
  statusActions: string[];
  canWarn: boolean;
};

export type ModerationContext = {
  path: string;
  page: { kind: string; label: string; pickable: boolean };
  picked: boolean;
  subject: ModerationSubject | null;
  accounts: ModerationAccount[];
  contentActions: ModerationContentAction[];
  reports: ModerationReport[];
  recentActions: ModerationRecentAction[];
  viewer: ModerationViewer;
  limits: { reasonMin: number; reasonMax: number };
};

export type AccountActionInput = {
  type: AccountActionId;
  warningId?: string;
  punishmentId?: string;
  customDuration?: boolean;
  duration?: "temporary" | "permanent";
  endsAt?: string | null;
  /** Team targets: who else gets it (leader | selected | all; never the team alone). */
  memberScope?: "leader" | "selected" | "all";
  memberAccountIds?: string[];
};

export type ModerationActionInput = {
  path: string;
  pick: string | null;
  subjectKey: string;
  accountId?: string | null;
  accountAction?: AccountActionInput | null;
  contentAction?: ContentActionId | null;
  reason: string;
  confirmRecent?: boolean;
};

export type ModerationActionResult = {
  partial: boolean;
  message: string;
  content: { id: ContentActionId; ok: boolean; message: string } | null;
  account: { type: AccountActionId; ok: boolean; message: string } | null;
  reportsOnItem: string[];
  context: ModerationContext | null;
};

/** A refusal from the action endpoint, with the server's code and details kept. */
export class ModerationActionError extends Error {
  code: string | null;
  recent: ModerationRecentAction[];
  status: number;
  constructor(message: string, status: number, code: string | null, recent: ModerationRecentAction[] = []) {
    super(message);
    this.code = code;
    this.recent = recent;
    this.status = status;
  }
}

export async function fetchModerationContext(
  path: string,
  pick: string | null,
  signal?: AbortSignal,
): Promise<ModerationContext> {
  const res = await api.get("/api/staff/platform-view/context", {
    params: { path, ...(pick ? { pick } : {}) },
    signal,
  });
  if (!res.data?.success) throw new Error(res.data?.message || "Could not load moderation details");
  return res.data.data as ModerationContext;
}

export async function submitModerationAction(input: ModerationActionInput): Promise<ModerationActionResult> {
  try {
    const res = await api.post("/api/staff/platform-view/actions", input);
    if (!res.data?.success) throw new ModerationActionError(res.data?.message || "The action could not be applied", 400, null);
    return res.data.data as ModerationActionResult;
  } catch (err) {
    if (err instanceof ModerationActionError) throw err;
    const response = (err as { response?: { status?: number; data?: { message?: string; code?: string; details?: { recent?: ModerationRecentAction[] } } } })?.response;
    if (response) {
      throw new ModerationActionError(
        response.data?.message || "The action could not be applied",
        response.status || 500,
        response.data?.code || null,
        response.data?.details?.recent || [],
      );
    }
    throw new ModerationActionError("Could not reach the server. Check your connection and try again.", 0, null);
  }
}

export const ACCOUNT_ACTION_LABELS: Record<AccountActionId, string> = {
  warn: "Warn",
  timeout: "Forum timeout",
  suspend: "Suspend",
  lock: "Lock",
  ban: "Ban",
};

/** Console routes for the links the panel offers, by the console platform view is open in. */
export function consoleLinks(consolePath: string) {
  const base = consolePath.startsWith("/admin")
    ? "/admin"
    : (consolePath.match(/^\/moderator\/(forum|marketplace|support|jobs)/)?.[0] ?? null);
  const desk = base === "/admin" ? "admin" : base ? base.split("/")[2] : null;
  return {
    userTeam: base === "/admin" ? "/admin/user-team?tab=users" : base ? `${base}/user-team` : null,
    disputes: base === "/admin" ? "/admin/moderation?tab=cases&queue=disputes" : base ? `${base}/disputes` : null,
    report(report: ModerationReport): string | null {
      if (base === "/admin") return "/admin/moderation?tab=cases&queue=reports";
      if (!desk || !report.number) return null;
      const q = `q=${encodeURIComponent(report.number)}`;
      if (desk === "support") return `/moderator/support/reports?${q}${report.desk === "support" ? "" : "&scope=all"}`;
      return desk === report.desk ? `${base}/reports?${q}` : null;
    },
    contentDesk(area: ModerationSubject["area"]): string | null {
      if (base === "/admin") {
        return ["forum", "marketplace", "jobs"].includes(area) ? `/admin/moderation?tab=management&section=${area}` : null;
      }
      if (area === "forum" && desk === "forum") return "/moderator/forum/forum-control";
      if (area === "marketplace" && desk === "marketplace") return "/moderator/marketplace/marketplace-control";
      if (area === "jobs" && desk === "jobs") return "/moderator/jobs/control";
      return null;
    },
  };
}
