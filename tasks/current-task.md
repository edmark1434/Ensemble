# Current Task: Member account deactivation

## Objective
Members can deactivate their own account. A deactivated account disappears from member search and public profile views. Staff and admins can still search and open the profile, including from platform view. The deactivated member sees only a reactivation screen with a status indicator and a 72-hour cooldown.

## Acceptance criteria
- [x] Deactivation sets account status to Deactivated and stores the reactivation time.
- [x] Member search, public profiles, follower lists, and public galleries hide deactivated accounts from non-staff.
- [x] Staff sessions can search and open those profiles, with a Deactivated indicator.
- [x] A deactivated member can only call session, logout, and reactivation endpoints.
- [x] Reactivation stays locked for 72 hours and the screen shows the remaining time.
- [x] Frontend build succeeds.
- [ ] Apply `1823900000000_account-deactivation` from a host Postgres accepts. This machine was rejected by `pg_hba.conf`.
