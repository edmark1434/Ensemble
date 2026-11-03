# Frontend

## Stack and entry points

- React 18 + TypeScript + Vite.
- Entry: `frontend/src/main.tsx`; application routing/root: `frontend/src/App.tsx`.
- Shared API client: `frontend/src/lib/api.ts`.
- Shared Socket.IO client: `frontend/src/lib/socket.ts`.
- Shared global state exists in `frontend/src/lib/global_state.ts`; feature-local state may use Zustand or existing component patterns.

## Staff consoles

- Admin, moderator, and staff portal pages are registered in `frontend/src/pages/staff/staffPages.ts` with `lazyWithPreload`. Add new console pages there and to the matching console list, not as `lazyPage` entries in `App.tsx`.
- Console layouts render `StaffOutlet`. It keeps the sidebar mounted behind a content-area loader and preloads the console's other pages once the browser is idle.

## Component practices

- Admin warning catalog, standing punishments, and point thresholds live at `/admin/warnings` (`AdminWarningsPage`). Staff warn pickers load `/api/admin/warning-catalog` (or `/api/moderator/warning-catalog`) instead of a hardcoded list. Warning duration is displayed read-only; staff cannot set it.
- Admin badge catalog at `/admin/badges` loads `/api/admin/badge-categories` for the category dropdown. Staff pick a live category or create one inline. Do not send a free-text category on badge save. The Grant tab groups badges by category. Profile pins, the pin modal, and discovery cards hydrate catalog rows (including honorary badges) with `category` from the API.
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

- The export modal displays a minimum of 1% after one second of an active export. This is a presentation-only floor; server progress is unchanged. Queue position, failures, completion and cancellation retain their existing states.
- Completed exports auto-request a download once after three seconds and keep the Download button available for manual retries. A browser download request is not treated as confirmed saved. Closing the completed-output modal calls the existing render cleanup endpoint and resets export state; output stays available until that dismissal, subject to existing expiration. Closing an active render only hides its progress modal.
- The active project/scene comments WebSocket invalidates the authenticated comment list. Each successful snapshot is compared by entry ID to detect mentions and replies to the viewer's top-level comments; the server's author-only `canDelete` flag excludes self-notifications. Older overlapping responses are ignored.
- Navbar counts and entry/thread badges track unread entries. Notifications clear for a thread only when its floating thread panel opens, including replies received while that thread remains open. Viewing the main comments list never acknowledges notifications. Incoming entries show a five-second automatic tooltip and play the main site's `notification.mp3`, subject to browser autoplay permission.
- Notification checkpoints contain known, unread and acknowledged entry IDs, keyed by user and project/scene in browser localStorage, with an in-memory fallback. They persist until browser storage is cleared; deleted entries are removed from unread counts on refresh, while known/acknowledged IDs remain to prevent repeat alerts after incomplete snapshots. Opening a floating thread acknowledges its individual entries, so reading two replies and later receiving a third contributes only one unread notification. First visits baseline existing comments without announcing them; subsequent snapshots (including reconnect/reload) detect new IDs. Read state is browser-local, not synchronized across devices. No database migration or additional WebSocket is used.

## Verification

- Run `cd frontend && npm run build` after TypeScript/UI changes.
- Run `npm run lint` when touching lint-sensitive code; report unrelated pre-existing failures separately.
- Test loading, empty, success, validation, provider failure, and reconnect states.
