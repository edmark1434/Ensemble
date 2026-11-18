import useGlobalState from "@/lib/global_state";
import { formatStandingWhen, type StandingRestriction } from "@/lib/standing";
import { useSuspension } from "@/lib/useSuspension";

export type ForumLockReason = "timeout" | "suspended" | "merit" | null;

/**
 * Platform Merit bands that turn forum posting off. Mirrors `ACTION_ALLOW.forum_write` in
 * `backend/lib/WarningBands.js`. The band id comes from the backend, which reads the live
 * thresholds, so custom point ranges still match.
 */
const FORUM_WRITE_BLOCKED_BANDS = new Set(["restricted", "frozen"]);

/** Error codes the axios interceptor already explains with a toast. */
const HANDLED_RESTRICTION_CODES = new Set([
  "FORUM_TIMEOUT",
  "ACCOUNT_SUSPENDED",
  "WARNING_RESTRICTED",
  "WARNING_FROZEN",
]);

/**
 * Whether forum writes are off for the signed-in member right now: a forum timeout, a
 * suspension (read-only everywhere), or Platform Merit in a band that pauses forum posting
 * (Restricted or Frozen access). Read from the live standing on the user so forum write
 * controls switch off up front instead of letting the request fail. The backend still enforces it.
 */
export function useForumTimeout() {
  const restriction = useGlobalState((state) => state.user?.restriction) as StandingRestriction | null | undefined;
  const userType = useGlobalState((state) => state.user?.type as string | undefined);
  const suspension = useSuspension();

  const endsAt = restriction?.forumTimeoutEndsAt || null;
  const endsAtMs = endsAt ? new Date(endsAt).getTime() : NaN;
  const timedOut = Boolean(restriction?.forumTimeout) && (!Number.isFinite(endsAtMs) || endsAtMs > Date.now());
  const until = formatStandingWhen(endsAt);

  const band = String(restriction?.warningBand || "none").toLowerCase();
  const lowMerit = userType !== "Staff" && FORUM_WRITE_BLOCKED_BANDS.has(band);

  // The widest lock explains the state when more than one applies.
  const reason: ForumLockReason = suspension.suspended
    ? "suspended"
    : timedOut
      ? "timeout"
      : lowMerit
        ? "merit"
        : null;

  let message = "";
  let lockEndsAt: string | null = null;
  if (reason === "suspended") {
    lockEndsAt = suspension.endsAt;
    message = suspension.until
      ? `Your account is suspended until ${suspension.until}. You can still read the forums, but posting is off.`
      : "Your account is suspended. You can still read the forums, but posting is off.";
  } else if (reason === "timeout") {
    lockEndsAt = endsAt;
    message = until
      ? `You're timed out from the forums until ${until}. You can still read, but posting is off.`
      : "You're timed out from the forums. You can still read, but posting is off.";
  } else if (reason === "merit") {
    const merit = Number(restriction?.merit);
    const label = restriction?.warningBandLabel || (band === "frozen" ? "Frozen access" : "Restricted");
    const meritText = Number.isFinite(merit) ? `Your Platform Merit is ${merit} (${label})` : `Your Platform Merit is ${label}`;
    // Restricted is the lowest band that pauses posting, so its end date is when posting
    // returns. Frozen ends into Restricted, which still pauses it.
    const bandEnds = band === "restricted" ? restriction?.warningBandEndsAt || null : null;
    const returns = formatStandingWhen(bandEnds);
    lockEndsAt = bandEnds;
    message = `${meritText}, so forum posting is paused. You can still read and report. ${
      returns ? `Posting comes back on ${returns}, when enough warnings expire.` : "Posting comes back when enough warnings expire."
    }`;
  }

  return {
    /** True while forum writes are off, for any reason. */
    locked: reason !== null,
    reason,
    /** Reports stay open at low merit; a timeout or suspension turns them off too. */
    reportLocked: reason === "timeout" || reason === "suspended",
    endsAt: lockEndsAt,
    message,
  };
}

/** True when the axios interceptor already showed a toast for this restriction error. */
export function isRestrictionErrorHandled(error: any) {
  return HANDLED_RESTRICTION_CODES.has(error?.response?.data?.code);
}
