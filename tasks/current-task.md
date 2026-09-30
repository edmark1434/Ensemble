# Current Task — Enforce Suspend, Ban, and Violation Notices

Make account suspend and ban actually stop platform access, and show a highly visible notice for banned, suspended, locked, and warned accounts.

## Acceptance Criteria

- [x] Login, refresh, session, JWT, and Socket.IO reject accounts whose status is Banned, Suspended, or Locked, and clear the existing session.
- [x] Login and staff/admin sign-in show a large restriction notice with active violations.
- [x] An in-app full-screen notice appears when a live session is rejected.
- [x] Active accounts with open violations see a sticky warning banner.
