# Frontend

## Stack and entry points

- React 18 + TypeScript + Vite.
- Entry: `frontend/src/main.tsx`; application routing/root: `frontend/src/App.tsx`.
- Shared API client: `frontend/src/lib/api.ts`.
- Shared Socket.IO client: `frontend/src/lib/socket.ts`.
- Shared global state exists in `frontend/src/lib/global_state.ts`; feature-local state may use Zustand or existing component patterns.

## Staff consoles

- Admin lives on `admin.ensemble.software` (`admin.localhost:5173` in dev). Staff lives on `staff.ensemble.software` (`staff.localhost:5173`). The main site redirects `/admin` and `/staff` to those hosts. Browser paths omit the prefix (`/dashboard`); route code still uses `/admin` and `/staff`. Moderator desks stay on the main site.
- Point both console hosts at this same frontend build, and serve `index.html` for their client-side paths. The API allows those origins from `FRONTEND_URL`.
- The admin console has its own session. It calls `/api` and `/socket.io` on its own host (the Vite proxy locally; the production proxy must forward both paths on `admin.ensemble.software`), so its cookies never reach the member site. The member site signs out any admin session it finds and refuses admin logins.
- The staff portal shares the member site's session in production because moderator desks still live on the main site. Locally `staff.localhost` uses the Vite proxy, since it cannot share cookies with `localhost`.
- Because that session is shared, `/`, `/login`, `/signup`, `/forgot-password`, and `/reset-password` on the main site must not auto-redirect an existing staff session into the staff desk. Staff portal “Member login” links go to the main-site `/login` so a staff cookie cannot trap someone away from user login.
- Platform view and reported-item previews frame member pages from the console host itself (for example `admin.ensemble.software/forums`). Inside that same-origin frame no prefix mapping or redirect applies, so the preview keeps the staff session and the view-only guard. A console host framed by any other origin renders nothing.
- `StaffMiddleware` requires the Admin role for every `/admin/*` route. The backend remains the authority: every admin API route uses `checkSession` + `requireAdmin`.
- Admin, moderator, and staff portal pages are registered in `frontend/src/pages/staff/staffPages.ts` with `lazyWithPreload`. Add new console pages there and to the matching console list, not as `lazyPage` entries in `App.tsx`. New admin pages also need their first path segment added in `frontend/src/lib/consoleHosts.ts`.
- Console layouts render `StaffOutlet`. It keeps the sidebar mounted behind a content-area loader and preloads the console's other pages once the browser is idle.
- Staff page and tab list/overview loads use `staffGet` and seed state from `peekStaffGet` (see `docs/caching.md`). Show the blocking spinner only when nothing is cached; a failed background refetch keeps the shown data. Add new mount-time GETs to `lib/staffPrefetch.ts`.

## Component practices

- Admin warning catalog, standing punishments, and point thresholds live under Moderation → Policy (`/admin/moderation?tab=policy`, `AdminWarningsPanel`). Legacy `/admin/warnings` redirects there. Staff warn pickers load `/api/admin/warning-catalog` (or `/api/moderator/warning-catalog`) instead of a hardcoded list. Warning duration is displayed read-only; staff cannot set it.
- Admin badge catalog lives under Settings → Badges (`/admin/system-settings?tab=badges`, `AdminBadgesPanel`). Legacy `/admin/badges` redirects there. It loads `/api/admin/badge-categories` for the category dropdown. Staff pick a live category or create one inline. Do not send a free-text category on badge save. The Grant section groups badges by category. Profile pins, the pin modal, and discovery cards hydrate catalog rows (including honorary badges) with `category` from the API.
- Admin sidebar lists Reports only inside Moderation → Pending cases (no duplicate Reports nav item).
- Moderation → Activity log (`ActivityLogTab`) reads `/api/admin/moderation/activity`, so its search, filters, date range, sorting and paging cover the whole history instead of the slice in the page overview. `ActivityDetailModal` re-reads one entry and shows the event, its impact, target, actor, reference, every metadata field, the reversal trail and the raw row. Shared formatting lives in `moderation/moderationFormat.ts`; do not re-add per-file date helpers there.
- Moderation → Management → Forum and the Forum Moderator desk both render `moderation/ForumModerationDesk`, which takes `apiBase` (`/api/admin/moderation/forum` or `/api/moderator/forum`) and optional `accent` / `onViewChange`. Change the desk once; both consoles follow. Forum Moderator mounts it once as **Forum Control** (`/moderator/forum/forum-control`) with Discussions | Groups tabs (`?view=groups`). Legacy `/forum-discussion` and `/groups` redirect there.
- Same shared-desk pattern for Marketplace Control and Jobs & Gigs Control: admin Management sections pass `apiBase` (`/api/admin/moderation/marketplace` or `…/jobs`) plus `embedded`; moderator pages keep the default mod API roots. Listing case review reuses `ListingDetailModal` against the admin marketplace API. Listing detail includes the linked market asset so staff can review pending assets that are not yet public on `/assets/:id`: every content file (original name, format, size, specs, processing status and error), showcase images, template metadata, tags, buyer activity, reports on the listing or asset, seller standing, copyright signals (other assets with a same-size, same-type upload or the same title) and the listing's staff history. `ListingFileInspector` switches between the watermarked preview and the original upload; originals come from `GET {apiBase}/listings/:id/media/:mediaAssetId/original` (`?download=1` for an attachment), a 15-minute signed link, because originals under `asset-originals/` are private and pending video/audio has no proxy until processing ends. Never build a CloudFront URL for an `asset-originals/` path; the detail API drops such paths.
- Marketplace listing actions live in `marketplace-moderator/listingActions.tsx` (`LISTING_ACTIONS`, `actionsForStatus`, `ListingReasonDialog`); the queue's row menu and the detail modal both use them. Approved listings can be delisted or sent back to `pending` ("Require re-approval", the copyright path); both need a reason, stored in `marketplace_listings.moderation_note` (rejections keep `rejection_reason`) and sent to the seller.
- The Marketplace Moderator console has no Restrictions tab: marketplace enforcement is issued from a report case. Its ticket desk and ticket API only serve marketplace ticket types that Admin has not taken over (escalated to Admin or handled by an Admin); sending a ticket to another desk or escalating it to Admin closes it on this desk.
- Ticket detail "Category & routing" (`TicketDetailModalShell`, every desk): **Change category** sends `{ action: 'recategorize', type, reason? }` and stays inside the ticket's current desk (handler and status kept); **Send to another desk** and **Escalate to Admin** send `assigned_role` + `type` (+ optional `reason`). Reasons land on the ticket timeline.
- Marketplace listing ids are UUIDs. Never pass them through `Number()` (it produced `/listings/NaN` and a 500 in the admin Listing approvals modal).
- `ModeratorReportsPage` reads `?q=`, `?status=`, `?priority=`, `?assignee=` once on mount and passes them to `ReportDesk` as `preset`. Pass `listingApiBase` to let a report case open the linked listing (`ReportCaseDetailModal` shows `subject.marketplace` and `history`).
- Marketplace dashboard reads `ticketSla`, `reportSla`, `activity` (14 days), `team` and `sellersToWatch` from `/api/moderator/marketplace/overview`; alerts carry `title`, `detail`, `count` and `action: { tab, query }`.
- Admin User & Team → Restrictions embeds `ModeratorRestrictionsDesk` at `/api/admin/restrictions` (full admin capabilities). Specialist mod consoles may keep their own Restrictions routes; the Forum Moderator console does not — warn / timeout / suspend stay on User & Team.
- Jobs & Gigs Moderator console has no Restrictions page (`/moderator/jobs/restrictions` redirects to User & Team); enforcement happens in a report case or User & Team → Users. Jobs & Gigs Control (`JobsGigsControl`) sorts reported postings first, shows per-posting open-report counts, and every Pause / Close / Archive goes through `PostingReasonDialog` (reason required). `jobs-moderator/PostingDetailModal` loads and moderates one posting on its own (reports on the posting, moderation history, owner history) so the dashboard and Control open the same review; shared posting helpers live in `jobs-moderator/postingUi.tsx`.
- Support Moderator console has no Restrictions page (`/moderator/support/restrictions` redirects to User & Team); enforcement happens in a report case or User & Team → Users. Its Ticket Management shows only the support queue, so it hides the Queue filter and keeps Support group + Type (`?subgroup=` deep-links work). Its Reports page passes `scopeOptions` to `ModeratorReportsPage`: Support scope (default, no query param) or All platform (`?scope=all`).
- `ModeratorTicketDesk` has Queue and My tickets views (`?view=mine`), matching the Support desk. "Mine" matches on the signed-in staff id, and the summary cards plus quick chips describe the selected view.
- Platform Feedback lives under Analytics → Feedback (`/admin/analytics?tab=feedback`). Legacy `/admin/feedbacks` redirects there.
- Staff ban, suspend, and timeout pickers load `/api/admin/punishment-catalog` (or `/api/moderator/punishment-catalog`). The catalog duration is the default. Staff may override it and must still write a reason.
- User-facing screens say **Platform Merit**, never “warning points.” Merit is `100 − active warning points` from standing (`frontend/src/lib/merit.ts`). Staff desks keep warning-point language.
- Follow the existing dark Ensemble theme, spacing, typography, borders, and controls.
- Do not introduce gradients or visually unrelated component systems unless requested.
- Reuse existing components and tokens before creating new ones.
- Keep page components focused; move reusable or complex behavior into components/hooks.
- Preserve responsive behavior and keyboard navigation.

## Forms

- Display field-level errors near the corresponding input.
- Required fields need both frontend guidance and backend validation.
- Disable duplicate submissions while a request is pending.
- Never treat frontend validation as a security boundary.
- Password guidance stays hidden while empty; while typing, unmet rules use a neutral white dash and met rules use a green check.

## Realtime UI

- Subscribe once and clean up listeners on unmount.
- Avoid registering duplicate handlers on rerenders.
- Merge events by stable ID and treat duplicates as normal.
- Fetch authoritative state on initial load/reconnect.
- Presence should use heartbeat/connection state with a timeout, not a permanent boolean.

## Editor export and comment feedback

- The editor upload storage bar uses `red-500` at 80% usage and above, and the normal primary color below 80%. Its width and warning threshold both use actual used bytes divided by the database plan allowance.

- The export modal displays a minimum of 1% after one second of an active export. This is a presentation-only floor; server progress is unchanged. Queue position, failures, completion and cancellation retain their existing states.
- Completed exports auto-request a download once after three seconds and keep the Download button available for manual retries. A browser download request is not treated as confirmed saved. Closing the completed-output modal calls the existing render cleanup endpoint and resets export state; output stays available until that dismissal, subject to existing expiration. Closing an active render only hides its progress modal.
- The active project/scene comments WebSocket invalidates the authenticated comment list. Each successful snapshot is compared by entry ID to detect mentions and replies to the viewer's top-level comments; the server's author-only `canDelete` flag excludes self-notifications. Older overlapping responses are ignored.
- Navbar counts and entry/thread badges track unread entries. Notifications clear for a thread only when its floating thread panel opens, including replies received while that thread remains open. Viewing the main comments list never acknowledges notifications. Incoming entries show a five-second automatic tooltip and play the main site's `notification.mp3`, subject to browser autoplay permission.
- Notification checkpoints contain known, unread and acknowledged entry IDs, keyed by user and project/scene in browser localStorage, with an in-memory fallback. They persist until browser storage is cleared; deleted entries are removed from unread counts on refresh, while known/acknowledged IDs remain to prevent repeat alerts after incomplete snapshots. Opening a floating thread acknowledges its individual entries, so reading two replies and later receiving a third contributes only one unread notification. First visits baseline existing comments without announcing them; subsequent snapshots (including reconnect/reload) detect new IDs. Read state is browser-local, not synchronized across devices. No database migration or additional WebSocket is used.

## Verification

- Run `cd frontend && npm run build` after TypeScript/UI changes.
- Run `npm run lint` when touching lint-sensitive code; report unrelated pre-existing failures separately.
- Test loading, empty, success, validation, provider failure, and reconnect states.
