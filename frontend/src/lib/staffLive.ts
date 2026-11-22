import { useEffect, useRef } from "react";
import socket from "@/lib/socket";
import { forgetStaffInflight } from "@/lib/staffCache";

/**
 * Live staff consoles.
 *
 * The server tells every staff socket what changed, after it is saved:
 * - `staffCaseChanged` `{ kind, id, reason }` for a ticket, dispute or report;
 * - `staffDataChanged` `{ topics }` for anything else (any staff write sends every topic; member
 *   writes and background jobs send the areas they touched — `backend/middleware/StaffLiveUpdates.js`).
 * Payloads carry ids and area names only, so every page re-reads its own data over HTTP.
 *
 * One set of socket handlers serves every page (`subscribe`). Each hook folds a burst into one
 * call, never runs two calls of the same view at once, waits while the tab is hidden, re-reads
 * after a reconnect, and polls slowly while the socket is down.
 */

export type StaffLiveTopic =
  | "accounts"
  | "teams"
  | "economy"
  | "marketplace"
  | "jobs"
  | "forum"
  | "moderation"
  | "policy"
  | "settings"
  | "badges"
  | "feedback"
  | "videos"
  | "staff"
  | "tickets"
  | "disputes"
  | "reports";

const TOPICS = new Set<StaffLiveTopic>([
  "accounts",
  "teams",
  "economy",
  "marketplace",
  "jobs",
  "forum",
  "moderation",
  "policy",
  "settings",
  "badges",
  "feedback",
  "videos",
  "staff",
  "tickets",
  "disputes",
  "reports",
]);

/**
 * `staffCaseChanged` socket payload. Every staff socket gets it (room `staff:cases`) after a
 * ticket, dispute or report is opened, answered, claimed, moved or decided. It carries ids
 * only: desks read the case back over HTTP, which applies each desk's own access rules.
 */
export type StaffCaseChange = {
  kind: "ticket" | "dispute" | "report";
  id: string;
  reason?: string | null;
  at?: string;
};

const CASE_TOPIC: Record<StaffCaseChange["kind"], StaffLiveTopic> = {
  ticket: "tickets",
  dispute: "disputes",
  report: "reports",
};

type Signal =
  | { type: "change"; topics: StaffLiveTopic[]; caseChange?: StaffCaseChange }
  | { type: "resync" };

/** What a view is told when it should re-read. */
export type StaffLiveBatch = {
  /** True after a reconnect or a fallback poll: anything may have changed. */
  resync: boolean;
  /** Areas that changed since the last call. */
  topics: StaffLiveTopic[];
  /** Tickets, disputes and reports that changed since the last call. */
  cases: StaffCaseChange[];
};

/** While the socket is down, views re-read this often so nothing stays stale for long. */
const FALLBACK_POLL_MS = 45_000;

const subscribers = new Set<(signal: Signal) => void>();
let wired = false;
let missed = false;
let fallbackTimer: number | undefined;

function broadcast(signal: Signal) {
  forgetStaffInflight();
  for (const subscriber of [...subscribers]) subscriber(signal);
}

function startFallbackPoll() {
  missed = true;
  if (fallbackTimer !== undefined) return;
  fallbackTimer = window.setInterval(() => {
    if (subscribers.size && !socket.connected) broadcast({ type: "resync" });
  }, FALLBACK_POLL_MS);
}

function stopFallbackPoll() {
  window.clearInterval(fallbackTimer);
  fallbackTimer = undefined;
}

function wire() {
  if (wired) return;
  wired = true;
  // Anything saved before the first connection was not heard: read back once connected.
  missed = !socket.connected;
  socket.on("staffDataChanged", (payload: { topics?: string[] } | undefined) => {
    const topics = (payload?.topics || []).filter((topic): topic is StaffLiveTopic =>
      TOPICS.has(topic as StaffLiveTopic)
    );
    if (topics.length) broadcast({ type: "change", topics });
  });
  socket.on("staffCaseChanged", (change: StaffCaseChange | undefined) => {
    const topic = change?.id ? CASE_TOPIC[change.kind] : undefined;
    if (topic && change) broadcast({ type: "change", topics: [topic], caseChange: change });
  });
  socket.on("disconnect", startFallbackPoll);
  socket.on("connect_error", startFallbackPoll);
  socket.on("connect", () => {
    stopFallbackPoll();
    if (!missed) return;
    missed = false;
    broadcast({ type: "resync" });
  });
}

function subscribe(listener: (signal: Signal) => void) {
  wire();
  subscribers.add(listener);
  if (!socket.connected) socket.connect();
  return () => {
    subscribers.delete(listener);
  };
}

/** Connects the console's socket early, so pages that mount later miss nothing. */
export function useStaffLiveConnection(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    return subscribe(() => {});
  }, [enabled]);
}

type LiveOptions = {
  enabled?: boolean;
  /** Bursts inside this window become one call. */
  delayMs?: number;
  /** Also re-read on this interval while the tab is visible (data that also changes elsewhere). */
  pollMs?: number;
};

function useLiveSubscription(
  key: string,
  accepts: (signal: Signal) => boolean,
  onFire: (batch: StaffLiveBatch) => unknown,
  { enabled = true, delayMs = 700, pollMs }: LiveOptions
) {
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;
  const acceptsRef = useRef(accepts);
  acceptsRef.current = accepts;

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let timer: number | undefined;
    let running = false;
    let queued = false;
    let waitingForTab = false;
    let batch: StaffLiveBatch = { resync: false, topics: [], cases: [] };

    const run = () => {
      timer = undefined;
      if (disposed) return;
      if (document.hidden) {
        waitingForTab = true;
        return;
      }
      if (running) {
        queued = true;
        return;
      }
      const current = batch;
      batch = { resync: false, topics: [], cases: [] };
      running = true;
      let result: unknown;
      try {
        result = onFireRef.current(current);
      } catch (error) {
        console.warn("Live staff refresh failed:", error);
      }
      void Promise.resolve(result)
        .catch(() => {
          // The view reports its own load errors.
        })
        .finally(() => {
          running = false;
          if (!disposed && queued) {
            queued = false;
            schedule();
          }
        });
    };

    const schedule = () => {
      if (timer === undefined) timer = window.setTimeout(run, delayMs);
    };

    const onSignal = (signal: Signal) => {
      if (!acceptsRef.current(signal)) return;
      if (signal.type === "resync") {
        batch.resync = true;
      } else {
        for (const topic of signal.topics) if (!batch.topics.includes(topic)) batch.topics.push(topic);
        if (signal.caseChange) batch.cases.push(signal.caseChange);
      }
      if (running) queued = true;
      else schedule();
    };

    const onVisibility = () => {
      if (document.hidden || !waitingForTab) return;
      waitingForTab = false;
      schedule();
    };

    const unsubscribe = subscribe(onSignal);
    document.addEventListener("visibilitychange", onVisibility);
    const poll =
      pollMs && pollMs > 0
        ? window.setInterval(() => {
            if (!document.hidden) onSignal({ type: "resync" });
          }, pollMs)
        : undefined;

    return () => {
      disposed = true;
      unsubscribe();
      window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [key, enabled, delayMs, pollMs]);
}

/**
 * Re-read a staff view when any of `topics` changes elsewhere (a member, another staff member,
 * a background job, this staff member in another tab). Return the reload promise so calls never
 * overlap. Keep the reload silent: show the data on screen until the new response arrives.
 */
export function useStaffLive(
  topics: StaffLiveTopic[],
  onChange: (batch: StaffLiveBatch) => unknown,
  options: LiveOptions = {}
) {
  const key = [...new Set(topics)].sort().join(",");
  const wanted = useRef(new Set<StaffLiveTopic>());
  wanted.current = new Set(topics);
  useLiveSubscription(
    `topics:${key}`,
    (signal) => signal.type === "resync" || signal.topics.some((topic) => wanted.current.has(topic)),
    onChange,
    options
  );
}

/**
 * Re-read a staff view when a case changes elsewhere. Bursts are folded into one call, and a
 * reconnect calls it once, so anything missed while offline is read back.
 * @param kinds which case kinds this view lists
 * @param onChange called with the last change of the burst, or null after a reconnect or a
 *   change that names no single case (a background job, a bulk staff action)
 */
export function useStaffCaseEvents(
  kinds: StaffCaseChange["kind"][],
  onChange: (change: StaffCaseChange | null) => unknown,
  { enabled = true, delayMs = 500 }: { enabled?: boolean; delayMs?: number } = {}
) {
  const kindKey = [...new Set(kinds)].sort().join(",");
  const topics = useRef(new Set<StaffLiveTopic>());
  topics.current = new Set(kinds.map((kind) => CASE_TOPIC[kind]));
  useLiveSubscription(
    `cases:${kindKey}`,
    (signal) => signal.type === "resync" || signal.topics.some((topic) => topics.current.has(topic)),
    (batch) => {
      const named = batch.cases.filter((change) => topics.current.has(CASE_TOPIC[change.kind]));
      const unnamed = batch.resync || named.length === 0;
      return onChange(unnamed ? null : named[named.length - 1]);
    },
    { enabled, delayMs }
  );
}
