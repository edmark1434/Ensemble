import useGlobalState from "@/lib/global_state";
import { formatStandingWhen, type StandingRestriction } from "@/lib/standing";
import { useSuspension } from "@/lib/useSuspension";

export type ForumLockReason = "timeout" | "suspended" | "muted" | "merit" | null;

/**
 * Automatic merit bands that turn forum posting off. Mirrors `ACTION_ALLOW.forum_write` in
 * `backend/lib/WarningBands.js`. The band id comes from the backend (the strictest automatic
 * punishment running), so custom thresholds still match.
 */
const FORUM_WRITE_BLOCKED_BANDS = new Set(["restricted", "frozen"]);

/** Error codes the axios interceptor already explains with a toast. */
const HANDLED_RESTRICTION_CODES = new Set([
  "FORUM_TIMEOUT",
  "ACCOUNT_SUSPENDED",
  "WARNING_RESTRICTED",
  "WARNING_FROZEN",
]);

function liveUntil(endsAt?: string | null) {
  if (!endsAt) return true;
  const ms = new Date(endsAt).getTime();
  return !Number.isFinite(ms) || ms > Date.now();
}

/**
 * Whether forum writes are off for the signed-in member right now: a staff forum timeout, a
 * suspension (read-only everywhere), an automatic mute, or an automatic band that pauses forum
 * posting (Restricted or Frozen access). Mutes and bands are timed punishments that started
 * when Platform Merit dropped; they run their full time even if merit recovers. Read from the
 * live standing so forum write controls switch off up front. The backend still enforces it.
 */
export function useForumTimeout() {
  const restriction = useGlobalState((state) => state.user?.restriction) as StandingRestriction | null | undefined;
  const userType = useGlobalState((state) => state.user?.type as string | undefined);
  const suspension = useSuspension();
  const member = userType !== "Staff";

  const endsAt = restriction?.forumTimeoutEndsAt || null;
  const timedOut = Boolean(restriction?.forumTimeout) && liveUntil(endsAt);
  const until = formatStandingWhen(endsAt);

  const mutedUntil = restriction?.mutedUntil || null;
  const muted = member && Boolean(restriction?.muted) && liveUntil(mutedUntil);

  const band = String(restriction?.warningBand || "none").toLowerCase();
  const bandEndsAt = restriction?.warningBandEndsAt || null;
  const lowMerit = member && FORUM_WRITE_BLOCKED_BANDS.has(band) && liveUntil(bandEndsAt);

  // The widest lock explains the state when more than one applies.
  const reason: ForumLockReason = suspension.suspended
    ? "suspended"
    : timedOut
      ? "timeout"
      : muted
        ? "muted"
        : lowMerit
          ? "merit"
          : null;

  // Posting comes back when the last running punishment that blocks it ends.
  const forumPenaltyEnds = (restriction?.meritPenalties || [])
    .filter((p) => p.effect === "mute" || FORUM_WRITE_BLOCKED_BANDS.has(String(p.effect)))
    .map((p) => (p.endsAt ? new Date(p.endsAt).getTime() : NaN))
    .filter((t) => Number.isFinite(t));
  const postingReturnsAt = forumPenaltyEnds.length ? new Date(Math.max(...forumPenaltyEnds)).toISOString() : null;

  const merit = Number(restriction?.merit);
  const meritText = Number.isFinite(merit) ? `Your Platform Merit dropped to ${merit}` : "Your Platform Merit dropped";

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
  } else if (reason === "muted" || reason === "merit") {
    lockEndsAt = postingReturnsAt || (reason === "muted" ? mutedUntil : bandEndsAt);
    const returns = formatStandingWhen(lockEndsAt);
    const what = reason === "muted"
      ? "so you are muted"
      : `so ${restriction?.warningBandLabel || (band === "frozen" ? "Frozen access" : "Restricted access")} pauses forum posting`;
    message = `${meritText}, ${what}. You can still read and report. ${
      returns
        ? `Posting comes back on ${returns}, even if your merit recovers sooner.`
        : "Posting comes back when the punishment's time runs out."
    }`;
  }

  return {
    /** True while forum writes are off, for any reason. */
    locked: reason !== null,
    reason,
    /** Reports stay open while muted or at low merit; a timeout or suspension turns them off too. */
    reportLocked: reason === "timeout" || reason === "suspended",
    endsAt: lockEndsAt,
    message,
  };
}

/** True when the axios interceptor already showed a toast for this restriction error. */
export function isRestrictionErrorHandled(error: any) {
  return HANDLED_RESTRICTION_CODES.has(error?.response?.data?.code);
}
