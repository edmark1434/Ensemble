import useGlobalState from "@/lib/global_state";
import { formatStandingWhen } from "@/lib/standing";

/**
 * Whether the signed-in member is suspended right now, read from the live standing on the
 * user (`/api/users/me` → `restriction`). A suspension is read-only: browsing works, every
 * write is refused by the backend. The UI uses this to switch actions off up front so nobody
 * fills in a form only to have it rejected. The backend stays the authority.
 */
export function useSuspension() {
  const userType = useGlobalState((state) => state.user?.type as string | undefined);
  const userStatus = useGlobalState((state) => state.user?.status as string | undefined);
  const flagged = useGlobalState((state) => Boolean(state.user?.restriction?.suspended));
  const code = useGlobalState((state) => state.user?.restriction?.code as string | undefined);
  const restrictionStatus = useGlobalState((state) => state.user?.restriction?.status as string | undefined);
  const endsAt = useGlobalState(
    (state) => (state.user?.restriction?.suspensionEndsAt as string | null | undefined) || null,
  );

  const status = String(restrictionStatus || userStatus || "").toLowerCase();
  const member = Boolean(userType) && userType !== "Staff";
  const endsAtMs = endsAt ? new Date(endsAt).getTime() : NaN;
  const running = !Number.isFinite(endsAtMs) || endsAtMs > Date.now();
  const suspended = member && running && (flagged || status === "suspended" || code === "ACCOUNT_SUSPENDED");
  const until = suspended ? formatStandingWhen(endsAt) : "";

  return {
    suspended,
    endsAt: suspended ? endsAt : null,
    until,
    message: suspended
      ? until
        ? `Your account is suspended until ${until}. You can still look around, but this action is off until then.`
        : "Your account is suspended. You can still look around, but this action is off until the suspension ends."
      : "",
  };
}
