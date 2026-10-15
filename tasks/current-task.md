# Current Task: Realtime Ban, Lock, and Warning Notifications & Pop-up Modals

## Objective
Implement real-time action result pop-up modals when an account is banned or locked, and ensure issued warnings create persistent database notifications, real-time socket events, and dedicated toast notifications on the user's active session.

## Acceptance Criteria

1. **Realtime Ban and Lock Pop-Up Modal**:
   - When an account status is updated to `Banned` or `Locked` (via Admin User & Team, Admin Moderation, or Moderator Restrictions Desk):
     - The durable account status is committed in PostgreSQL first (`UPDATE accounts SET status = ...`).
     - A notification is recorded in the `notifications` table.
     - Real-time WebSocket events (`account:restricted`, `account:status_changed`, `notification`) are emitted to the target account's room.
     - The target user's active browser receives the socket event immediately in real time.
     - A pop-up modal appears on screen with high z-index and backdrop blur, displaying the action result:
       - Ban / Lock badge, title, and detailed reason.
       - Active violation history and penalty points.
       - A "Back to sign in" action that clears credentials and redirects to `/login`.
     - When an account is unlocked, unbanned, or restored to `Active`:
       - The blocked modal automatically dismisses in real time.
       - A success toast informs the user that account standing has been restored to Active.

2. **Warning Issuance: Database Notification & Realtime Toast**:
   - When a warning/violation is issued to an account:
     - A persistent notification is inserted into the `notifications` table (`reference_table = 'violations'`, `reference_prefix = 'WARNING'`).
     - Real-time WebSocket events (`notification`, `account:warning`) are broadcasted to the target account's room.
     - The notification bell increments, and the notification is listed under the "System" tab on `/notifications`.
     - A dedicated, high-visibility Warning Toast notification appears in the user's viewport in real time:
       - Warning shield alert icon with warning indicator.
       - Warning type (e.g. "Harassment warning") and penalty points.
       - Reason provided by the staff/moderator.
       - Notice explaining that further warnings can lead to automatic suspension.
       - One-click navigation link to view full notification details.

3. **Backend & Architecture Separation**:
   - Centralize notification and socket broadcasting in `AccountStandingServices.js`.
   - Integrate across `AdminUserTeamRepositories.js`, `ModeratorRepositories.js`, `AdminModerationRepositories.js`, and `StaffRepositories.js`.
   - Maintain controller → service → repository architecture and dark theme design (no gradients).
   - Invalidate active sessions for banned/locked accounts in Redis.

4. **Verification**:
   - Clean frontend build (`npm run build`).
   - Backend validation tests for warning creation, status change emission, and notifications.
