# Task: Timestamp-based saves and private preview links

Capture changed scenes and the project at one database timestamp. Preview and Apply resolve scenes at that cutoff using the original snapshot tables and columns. Open previews exclusively at `/saves/<project-id>?preview=<token>` with account-bound tokens.

# Task: Admin Dashboard "Team on duty" Online/Offline Presence

## Implementation Objective
The "Team on duty" panel on the admin dashboard lists every staff account but never says who is working right now. Show who is active (has a staff console open) and who is offline, with a last-seen time.

## Acceptance Criteria
- `backend/services/StaffPresenceServices.js`: Redis heartbeat presence under `presence:staff:v1:<accountId>` (150 s TTL) plus `presence:staff:v1:last:<accountId>` (30-day last seen). Writes are throttled to once per 30 s per account per process. Logout deletes the online key.
- `backend/middleware/CheckSession.js`: every authenticated staff request refreshes presence (fire-and-forget).
- `backend/routes/Staff.js`: `GET /api/staff/presence/heartbeat` keeps idle open console tabs online.
- `frontend/src/pages/staff/StaffOutlet.tsx`: every staff console (admin, moderator desks, staff portal) pings the heartbeat every 60 s while the tab is visible, and again when it becomes visible.
- `backend/controllers/AdminControllers.js` + `AdminRepositories.js`: `staffRoster` entries carry `isOnline` and `lastSeenAt`; online staff are listed first, in the existing role order.
- `frontend/src/pages/admin/AdminDashboard.tsx`: green/grey status dot, "Active now" or "Offline · seen X ago", dimmed offline rows, and an "N of M online now" subtitle.
- User preference: do not run automated build or verification commands.
