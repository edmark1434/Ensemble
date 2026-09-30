# Current Task — Suspended Accounts Stay Signed In

Suspended accounts, including Google sign-in, can still use Ensemble. The suspension stays highly visible and a notification is sent. Banned and locked accounts remain blocked.

## Acceptance Criteria

- [x] Suspended is not a login or session block. Banned, locked, and deleted accounts still are.
- [x] Google sign-in for an existing suspended account creates a session and returns the suspension on the user.
- [x] A persistent amber notice stays on screen while the account is suspended.
- [x] Suspending an account, including the automatic warning limit, creates an in-app notification and broadcasts it.

# Previous Task — Enforce Suspend, Ban, and Violation Notices

Make account suspend and ban actually stop platform access, and show a highly visible notice for banned, suspended, locked, and warned accounts.

## Acceptance Criteria

- [x] Login, refresh, session, JWT, and Socket.IO reject accounts whose status is Banned, Suspended, or Locked, and clear the existing session.
- [x] Login and staff/admin sign-in show a large restriction notice with active violations.
- [x] An in-app full-screen notice appears when a live session is rejected.
- [x] Active accounts with open violations see a sticky warning banner.
