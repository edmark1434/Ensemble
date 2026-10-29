# Frontend

## Stack and entry points

- React 18 + TypeScript + Vite.
- Entry: `frontend/src/main.tsx`; application routing/root: `frontend/src/App.tsx`.
- Shared API client: `frontend/src/lib/api.ts`.
- Shared Socket.IO client: `frontend/src/lib/socket.ts`.
- Shared global state exists in `frontend/src/lib/global_state.ts`; feature-local state may use Zustand or existing component patterns.

## Component practices

- Admin warning catalog, standing punishments, and point thresholds live at `/admin/warnings` (`AdminWarningsPage`). Staff warn pickers load `/api/admin/warning-catalog` (or `/api/moderator/warning-catalog`) instead of a hardcoded list. Warning duration is displayed read-only; staff cannot set it.
- Admin badge catalog at `/admin/badges` loads `/api/admin/badge-categories` for the category dropdown. Staff pick a live category or create one inline. Do not send a free-text category on badge save.
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

## Verification

- Run `cd frontend && npm run build` after TypeScript/UI changes.
- Run `npm run lint` when touching lint-sensitive code; report unrelated pre-existing failures separately.
- Test loading, empty, success, validation, provider failure, and reconnect states.
