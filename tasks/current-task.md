# Task: Suspended members blocked up front, warning-point lifts, and merit-recovery lifts

## Implementation Objective
1. A suspended member (read-only standing) cannot start any write (post a job or gig, upload or publish an asset, order, buy, propose, message, react, review, report, …). Write controls are switched off before they can be used, with a visible, recognisable "paused by your suspension" design, and write-only pages show a "paused" page instead of a form. The backend stays the authority.
2. Staff (Admin / Support) can lift warning points: hand Platform Merit back without deleting the warnings, by a number of points or up to a target merit. The automatic merit bands (Limited / Restricted / Frozen access) are live from active points, so a lift past a band's floor ends that band immediately.
3. An automatic (warning-engine) suspension ends early once merit recovers to the level set on its auto-suspend threshold. Staff suspensions are never ended this way.

## Acceptance Criteria
- Migration `1829200000000_warning-lift-and-auto-suspend-recovery`: `violations.points_original`, `warning_thresholds.lift_at_merit` (1–100 or NULL), `accounts.suspension_source` + `accounts.auto_suspend_lift_merit`; seeded auto-suspend rows lift at merit 81; accounts already serving an auto-suspension are back-filled.
- Lift: `GET /api/admin/accounts/:accountId/warnings/lift-preview` and `POST /api/admin/accounts/:accountId/warnings/lift` `{ points | targetMerit, violationId?, reason }` (Admin/Support). Points come off the longest-lasting warnings first (or one chosen warning); a warning lifted to zero gets status `lifted`. Activity `WARNING_POINTS_LIFTED`; the member is notified with their new merit and which band ended. No self-lift; only Admin may lift on a staff account.
- Auto-suspend stores `suspension_source = 'auto'` and the threshold's `lift_at_merit`. `liftRecoveredAutoSuspensions` runs after every band refresh, on the member's own requests, and in the one-minute standing sweep. Every staff status change, pardon and expiry clears the marker.
- Admin `/admin/warnings` → thresholds: auto-suspend rows edit "End early when Platform Merit recovers to"; band rows show the merit at which they end by themselves.
- Lift panel in Admin User & Team → History modal and in the moderator Restrictions desk (Support/Admin), with quick lifts ("End Frozen access · lift 3 → merit 85"), a live result preview, and a staff-only reason. Lifted points show on staff lists and the member's Record.
- Suspension UI: `SuspensionGuard` (site-wide) locks write controls (faded, not-allowed cursor, amber dashed ring on hover, tooltip, one heads-up toast on click, typing/upload/submit blocked); appeal and support pages stay open. `SuspendedRouteGate` covers job/gig create and edit, proposals, gig orders, checkout, new project, dispute form, team invite/join, business verification. Forum locks treat a suspension like a timeout. The banner says "read-only, actions are off".
- Fixed: Platform Merit band-change socket events no longer show the blocked-account screen; the admin dashboard's active-violation count no longer counts rescinded or lifted warnings.

### Follow-up fixes (suspended-account errors)
- `GET /assets` 500: Vite build output moved from `dist/assets/` to `dist/static/` (`build.assetsDir`), so the marketplace page no longer collides with the build folder on the host.
- Suspended members can still do the reads that use POST and housekeeping (`list-of-details`, chat read receipts, inbox group-size sync, leaving/ending/syncing a running call), secure the account (2FA) and cancel a subscription.
- Suspended sockets are read-only instead of dead: joining conversation/forum/dispute rooms, presence and read receipts work. Socket standing refreshes on status change and every 30 s on write events. Forum-timeout sockets can join forum rooms again.
- Background requests refused for a suspension fail quietly; only the member's own clicks get the (single) toast. A suspension that starts mid-session updates the standing so the UI locks.
- Floating chat and inbox composers are replaced by a "Messaging is paused" notice while suspended. The editor hand-off route is gated. Guard: keyboard Tab is no longer trapped, menu items and press-activated menus are covered, filter forms are no longer blocked, more write labels (approve, confirm, verify, deactivate, …).
- The new code runs before and after the `1829200000000` migration (`lib/SchemaFeatures.js`): no 500s if the migration has not been applied yet; lifting points explains that it needs the migration.
- User preference: do not run automated build or verification commands.
