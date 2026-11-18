import useGlobalState from "@/lib/global_state";
import { formatStandingWhen, type StandingRestriction } from "@/lib/standing";

/**
 * Whether the signed-in member is timed out from the forums right now, read from the live
 * standing on the user. Used to switch forum write controls off up front instead of letting
 * the request fail. The backend still enforces the timeout.
 */
export function useForumTimeout() {
  const restriction = useGlobalState((state) => state.user?.restriction) as StandingRestriction | null | undefined;
  const endsAt = restriction?.forumTimeoutEndsAt || null;
  const endsAtMs = endsAt ? new Date(endsAt).getTime() : NaN;
  const timedOut = Boolean(restriction?.forumTimeout) && (!Number.isFinite(endsAtMs) || endsAtMs > Date.now());
  const until = formatStandingWhen(endsAt);

  return {
    timedOut,
    endsAt,
    message: timedOut
      ? until
        ? `You're timed out from the forums until ${until}. You can still read, but posting is off.`
        : "You're timed out from the forums. You can still read, but posting is off."
      : "",
  };
}

/** True when the axios interceptor already showed a toast for this restriction error. */
export function isRestrictionErrorHandled(error: any) {
  const code = error?.response?.data?.code;
  return code === "FORUM_TIMEOUT" || code === "ACCOUNT_SUSPENDED";
}
