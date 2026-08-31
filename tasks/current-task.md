# Current Task — Automatic Team Task Deadlines and Notifications

Automatically mark Team workspace tasks overdue after their due date and notify involved users about due tasks, new assignments, and status changes made by other people.

## Acceptance Criteria

- [x] A bounded background job checks Team task deadlines every minute.
- [x] Non-completed tasks with a passed due date automatically move to Overdue.
- [x] Overdue tasks do not count as completed workspace progress.
- [x] The Team workspace displays a dedicated Overdue column.
- [x] Task creators, assignees, and active Team Owners/Admins receive a durable due notification.
- [x] Due notifications are idempotent across retries and server restarts.
- [x] Newly assigned users receive a notification naming the person who assigned them.
- [x] Related users receive a notification when another person changes task status.
- [x] Notification and workspace updates are emitted through Socket.IO after durable writes.
- [x] Refresh and reconnect recover authoritative task and notification state from the API/database.
- [x] Migration, backend syntax, frontend build, and database transition verification pass.

Status: Completed August 31, 2026.

## Implementation Notes

Added the Overdue task status and an overdue notification checkpoint through an append-only migration. A partial unique notification index prevents duplicate TEAM_TASK_DUE notifications. The existing background scheduler processes at most 100 tasks per run, uses row locking to avoid duplicate state transitions, retries notifications that were not fully persisted, and broadcasts affected workspace updates.

Assignment notifications now identify the assigning person. Manual status-change notifications are sent to task creators, assignees, and active Team managers except the person who performed the change. Notification failures remain best-effort after a committed task mutation so the API does not report a successful task update as failed.

## Verification

- Applied migration 1800400000000_143-add-team-task-overdue-state successfully.
- Backend syntax checks passed for the migration, repository, service, and background scheduler.
- Frontend TypeScript and Vite production build passed.
- Rollback-only PostgreSQL test confirmed a passed-due task transitions to overdue; no test data remained.
- Scoped git diff check passed with only line-ending notices.
