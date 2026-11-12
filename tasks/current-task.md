# Active Task: Let a staff session switch to member login

## Implementation Objective

While a staff session cookie exists (signed in on staff.ensemble.software),
the main site must let the person reach the landing page and member login
and sign in as a regular user instead of being sent to the staff desk.

## Acceptance Criteria

- [x] Main-site `/` no longer auto-redirects a staff session to the staff desk.
- [x] Main-site `/login`, `/signup`, `/forgot-password`, `/reset-password`
      render their page for a staff session instead of the loading shell.
- [x] Signing in as a member from there replaces the session and goes to `/home`.
- [ ] Frontend typecheck passes (run when asked).
