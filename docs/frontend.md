# Frontend

## Stack and entry points

- React 18 + TypeScript + Vite.
- Entry: `frontend/src/main.tsx`; application routing/root: `frontend/src/App.tsx`.
- Shared API client: `frontend/src/lib/api.ts`.
- Shared Socket.IO client: `frontend/src/lib/socket.ts`.
- Shared global state exists in `frontend/src/lib/global_state.ts`; feature-local state may use Zustand or existing component patterns.

## Component practices

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
