import useGlobalState from "@/lib/global_state";
import { formatStandingWhen, type StandingRestriction } from "@/lib/standing";
import { useSuspension } from "@/lib/useSuspension";

export type ForumLockReason = "timeout" | "suspended" | null;

/**
 * Whether forum writes are off for the signed-in member right now: a forum timeout, or a
 * suspension (read-only everywhere). Read from the live standing on the user so forum write
 * controls switch off up front instead of letting the request fail. The backend still enforces it.
 */
export function useForumTimeout() {
  const restriction = useGlobalState((state) => state.user?.restriction) as StandingRestriction | null | undefined;
  const suspension = useSuspension();

  const endsAt = restriction?.forumTimeoutEndsAt || null;
  const endsAtMs = endsAt ? new Date(endsAt).getTime() : NaN;
  const timedOut = Boolean(restriction?.forumTimeout) && (!Number.isFinite(endsAtMs) || endsAtMs > Date.now());
  const until = formatStandingWhen(endsAt);

  // A suspension is the wider lock, so it explains the state when both apply.
  const reason: ForumLockReason = suspension.suspended ? "suspended" : timedOut ? "timeout" : null;

  let message = "";
  if (reason === "suspended") {
    message = suspension.until
      ? `Your account is suspended until ${suspension.until}. You can still read the forums, but posting is off.`
      : "Your account is suspended. You can still read the forums, but posting is off.";
  } else if (reason === "timeout") {
    message = until
      ? `You're timed out from the forums until ${until}. You can still read, but posting is off.`
      : "You're timed out from the forums. You can still read, but posting is off.";
  }

  return {
    /** True while forum writes are off, for either reason. */
    locked: reason !== null,
    reason,
    endsAt: reason === "suspended" ? suspension.endsAt : endsAt,
    message,
  };
}

/** True when the axios interceptor already showed a toast for this restriction error. */
export function isRestrictionErrorHandled(error: any) {
  const code = error?.response?.data?.code;
  return code === "FORUM_TIMEOUT" || code === "ACCOUNT_SUSPENDED";
}
