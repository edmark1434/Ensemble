import { useEffect } from "react";
import { create } from "zustand";
import api from "@/lib/axios";
import socket from "@/lib/socket";

/**
 * Cases: a member's support tickets and disputes in one place (`/support/cases`, and the
 * appeal page for banned, locked and suspended members).
 *
 * What a member may do on a case comes from the server as `access` (see
 * `backend/services/CaseServices.js`). Views show it; they never re-derive the rules, so the
 * banned/locked appeal page, the Cases page, the case bar and the sidebar badge always agree.
 */
export const CASES_PATH = "/support/cases";

export type CaseKind = "ticket" | "dispute";

export type CaseAccess = {
  kind: CaseKind;
  id: string;
  number: string | null;
  status: string;
  closed: boolean;
  /** Disputes: made public by staff. Null for tickets. */
  visibility: boolean | null;
  viewerRole: "requester" | "participant" | "disputer" | "disputee" | null;
  /** Disputes: the disputee sees only the outcome of a private case. */
  limited?: boolean;
  canReply: boolean;
  /** Why the composer is closed, in the member's words. */
  readOnlyReason: string | null;
  /** Who reads a reply, shown over the composer. */
  replyHint: string | null;
  canRate: boolean;
  /** Staff are waiting on the member, or the member has not given their side yet. */
  needsYou: boolean;
  attention: string | null;
  stage: string;
  stageLabel: string;
  /** Disputes: the public discussion page, when the member may open it. */
  publicPath: string | null;
  path: string;
};

export type CaseSummaryItem = {
  kind: CaseKind;
  id: string;
  number: string | null;
  title: string;
  updatedAt: string | null;
  access: CaseAccess;
};

export type CaseSummary = {
  openTickets: number;
  openDisputes: number;
  needsYou: number;
  items: CaseSummaryItem[];
};

/** `caseUpdated` socket payload: sent to each member on a case after it changes. */
export type CaseUpdate = {
  kind: CaseKind;
  id: string;
  number?: string | null;
  reason?: string;
  access?: CaseAccess;
  /** The member can no longer see this case (parties swapped on a private dispute). */
  removed?: boolean;
  updatedAt?: string;
};

export function casePath(kind: CaseKind, id: string) {
  return `${CASES_PATH}?${kind}=${encodeURIComponent(id)}`;
}

/** "Dispute DIS-123456" / "Ticket #TCK-1001". */
export function caseLabel(kind: CaseKind, number?: string | null) {
  if (kind === "ticket") return number ? `Ticket #${String(number).replace(/^#/, "")}` : "Support ticket";
  return number ? `Dispute ${number}` : "Dispute";
}

/** Notification prefixes and tables that belong to a member's cases. */
const CASE_NOTIFICATION_PREFIXES = new Set([
  "TICKET_RECEIVED",
  "TICKET_REPLY",
  "TICKET_CLOSED",
  "TICKET_RESOLVED",
  "TICKET_ASSIGNED",
  "TICKET_STAFF_OPEN",
  "TICKET_PARTICIPANT_ADDED",
  "TICKET_PARTICIPANT_REMOVED",
  "DIS",
]);

export function isCaseNotification(n: {
  reference_prefix?: string | null;
  reference_table?: string | null;
  reference_path?: string | null;
}) {
  const prefix = String(n.reference_prefix || "");
  const table = String(n.reference_table || "").toLowerCase();
  const path = String(n.reference_path || "");
  return (
    CASE_NOTIFICATION_PREFIXES.has(prefix) ||
    (prefix.startsWith("TICKET_") && prefix !== "TICKET_INVITE" && prefix !== "TICKET_INTERNAL_REPLY") ||
    table === "disputes" ||
    table === "tickets" ||
    path.startsWith(CASES_PATH)
  );
}

type CaseStore = {
  summary: CaseSummary | null;
  loaded: boolean;
  refresh: () => Promise<void>;
  reset: () => void;
};

let inFlight: Promise<void> | null = null;
let queued = false;

export const useCaseStore = create<CaseStore>((set) => ({
  summary: null,
  loaded: false,
  refresh: async () => {
    // One request at a time; a change during a request asks for one more afterwards.
    if (inFlight) {
      queued = true;
      return inFlight;
    }
    inFlight = (async () => {
      try {
        const res = await api.get("/api/users/cases/summary");
        if (res.data?.success) set({ summary: res.data.data, loaded: true });
      } catch {
        // Keep what is on screen; the next event or poll retries.
      } finally {
        inFlight = null;
        if (queued) {
          queued = false;
          void useCaseStore.getState().refresh();
        }
      }
    })();
    return inFlight;
  },
  reset: () => set({ summary: null, loaded: false }),
}));

/**
 * Socket events that mean a member's case changed. `caseUpdated` is the member event; the
 * other two cover staff-side broadcasts that reach the account room too.
 */
const CASE_EVENTS = ["caseUpdated", "disputeUpdated", "ticketStateChanged"] as const;

/**
 * Listen for case changes while mounted. `onChange` gets the `caseUpdated` payload when there
 * is one. Also fires on reconnect, so a view reads the authoritative state again.
 */
export function useCaseEvents(onChange: (update: CaseUpdate | null) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const handlers = CASE_EVENTS.map((event) => {
      const handler = (payload: unknown) =>
        onChange(event === "caseUpdated" && payload && typeof payload === "object" ? (payload as CaseUpdate) : null);
      socket.on(event, handler);
      return [event, handler] as const;
    });
    const onNotification = (payload: Parameters<typeof isCaseNotification>[0]) => {
      if (payload && isCaseNotification(payload)) onChange(null);
    };
    const onReconnect = () => onChange(null);
    socket.on("notification", onNotification);
    socket.on("connect", onReconnect);
    if (!socket.connected) socket.connect();
    return () => {
      handlers.forEach(([event, handler]) => socket.off(event, handler));
      socket.off("notification", onNotification);
      socket.off("connect", onReconnect);
    };
  }, [onChange, enabled]);
}

const SUMMARY_POLL_MS = 5 * 60_000;

/**
 * Keep the case summary fresh for a signed-in member: on mount, on every case event, when the
 * tab comes back, and every few minutes as a fallback. Mount once (the site-wide host).
 */
export function useCaseSummarySync(enabled: boolean, standingKey: string) {
  const refresh = useCaseStore((state) => state.refresh);
  const reset = useCaseStore((state) => state.reset);

  useEffect(() => {
    if (!enabled) {
      reset();
      return;
    }
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, SUMMARY_POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
    // A standing change (suspended, lifted) changes what the member may do on every case.
  }, [enabled, standingKey, refresh, reset]);

  useCaseEvents(refreshSummaryOnChange, enabled);
}

/** Module-level so `useCaseEvents` subscribes once. */
function refreshSummaryOnChange() {
  void useCaseStore.getState().refresh();
}
