# Current Task: Admin-granted, claimable account badges

Admin UI lives at `/admin/badge-grant` (nav: Badge Grant). Run `cd backend && npm run migrate` (`1822400000000_claimable-account-badges`) before use.

## Objective
Badges are granted by the server (Admin action or automatic rule), delivered as a System notification, and only appear publicly after the user claims them.

## Decisions
- Every badge, including automatic ones (Alpha Tester, Profile Complete), is pending until claimed.
- Only Admin can grant and revoke.
- Rank badges are granted manually for now; automatic rules come later.
- Unclaimed badges never expire.

## Acceptance criteria
- Users can no longer grant themselves arbitrary badges via `POST /api/accounts/grant-badge`.
- Admin can list the badge catalog, grant a badge to one or many users with a reason, and revoke a badge.
- Each grant creates a pending `account_badges` row plus a `BADGE_GRANTED` notification in the System tab.
- The notification has a Claim action; claiming is allowed only by the owner, only once, only while pending.
- Public profile and badge curation show only claimed badges; pending badges are visible only to the owner.
- Existing badge rows stay visible (backfilled as claimed).
- New migration with `up` and `down`; `cd frontend && npm run build` passes.
