# Current Task

## Objective

Make forum reports reach the Forum Moderator desk, and bring the report flow (member modal, staff case, live queue) up to the standard of the other report types. See docs/api.md "Member reports" and docs/punishment-system.md §8.

## Acceptance Criteria

- **Discussion reports file.** `submitDiscussionReport` reads the author from `user_id` (the field discussions store). Group, member, discussion and comment reports land in `/api/moderator/forum/reports`.
- **Comment reports.** `POST /api/forum/reports/discussions/:discussionId/comments/:commentId` (`target_type = 'comment'`, `reference_id` = discussion). Removed comments and own comments cannot be reported. Members can report a comment from the discussion page, the forum feed and the group page.
- **Safe input.** Malformed group/discussion ids return 404, not a BSON 500. Report reasons are capped at 50 characters (the `reports.type` column). Forum report errors use `{ success, message, code }` and never echo 5xx internals. A group whose owner left is still reportable (falls back to a group moderator, then to an unsanctionable platform report).
- **Live queue.** Every new report and every report change emits `staffCaseChanged` with `kind: 'report'` after it is saved. The moderator Reports pages, the Forum dashboard, the admin Reports tab and My cases re-read on it; an open report case refreshes when someone else claims or decides it.
- **Reported account context.** Report detail returns `reportedContext` for sanctionable reports: standing summary, recent warnings and restrictions, recent account activity, other reports against the account, and (for forum reports) the member's forum footprint (recent discussions and comments, removals, group bans). The case modal shows it.
- **Act from the report.** Report sanctions accept `timeout` (forum reports; Forum Moderator, Support, Admin) and `lock` (all report desks) alongside warning / suspend / ban, with the same role and target guards as the Users desk. Detail returns `sanctionTypes` for the viewer. Forum desks can remove the reported discussion or hide the reported comment from the case.
- **Member UI.** One theme-aware `ForumReportModal` (reason chips, 20–2,000 character details, inline server error, success state) replaces the forum group/member modals and matches the job/gig report popups. No gradients.

## Parallel task: platform view quick moderation

### Objective

Let Admin and every moderator act on what they see in platform view (warn, timeout, suspend, lock, ban, and hide/remove/delist/pause the item) from a staff-only console panel, with the same rules as the desks plus evidence, area scoping and duplicate protection. Also close the gaps in the shared punishment path this relies on. See docs/api.md "Platform view moderation" and docs/punishment-system.md §10.

### Acceptance Criteria

- **Console only.** A Moderate toggle in the platform view toolbar opens a panel beside the frame. The member site renders no staff controls, and the frame stays view-only.
- **Server-resolved subject.** `GET /api/staff/platform-view/context` reads the page's item (profile, team, forum group/discussion/comment, job, gig, asset, dispute) and its people from the server. Pick mode (`data-moderation-subject`) selects a forum post or comment on list pages.
- **Role and area rules.** Account actions follow §4.8 (ban Admin/Support only, timeout Forum/Support/Admin). Content actions follow the desk routes. Specialists act on their own area plus profiles and teams. Dispute pages are read-only. Staff targets need Admin. No self-actions. No suspension or lock over a stricter ban or lock.
- **Evidence.** Every audit row of a platform-view action carries the item's text, state, page, open reports and the paired action, captured before the change. The appeal case shows it. These fields cannot be set from a request body.
- **No double hits.** Recent staff action on the account (10 min) or item (24 h) needs `confirmRecent`. A per-account Redis lock prevents concurrent actions. Rate limit is 20 a minute.
- **Content first, partial reported.** The content action runs before the account action; a later account failure returns `partial: true` naming what happened.
- **Shared-path fixes.** Punishment rows are desk-checked like warnings. Catalog endpoints clamp specialists to their own desk. Custom suspension and timeout clocks are capped at 365 days, and open-ended ones are Admin/Support only (including appeal follow-ups). The ban-protection rule uses the real actor role for moderator sessions. Listing review and posting moderation refuse no-op re-applies and concurrent overwrites. User & Team's status dialog uses the viewer's desk catalog and hides open-ended clocks for specialists.
