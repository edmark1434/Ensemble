# Current task: Faster, smoother staff and admin consoles

## Objective

Reduce load time and navigation stalls across the admin console, every moderator desk, and the staff portal without changing what the pages show or what staff can do.

## Scope

- Frontend: preload staff console page chunks so sidebar navigation does not freeze, keep the sidebar visible while a page chunk loads, and stop serial request chains on staff pages.
- Backend: remove serial database round-trips from per-request middleware, cache configuration sections briefly in memory with write-through invalidation, stop repeating idempotent seeding/reconciliation writes on every GET, and run independent queries in parallel in the staff overview/list endpoints.

## Acceptance criteria

- Clicking any staff sidebar item after the console has loaded switches pages without waiting for a chunk download.
- While a page chunk does load (cold start), the sidebar stays visible and only the content area shows a loader.
- `getAccountAccess` returns the same result as before, with independent queries batched.
- Configuration reads are cached at most 15 seconds per process; saving settings invalidates the cache immediately.
- `ensureDefaultSettings` runs once per process instead of on every settings GET; dispute auto-assign reconciliation runs at most once every 30 seconds per process and never concurrently with itself.
- Revisiting any staff page or data-owning tab renders the last response immediately and refreshes in the background; hovering a sidebar link or tab starts its data load. Staff writes and sign-out clear the browser cache.
- `/api/admin/user-team-overview` no longer builds per-account history, activity, credit, or listing enrichment.
- No API response shape changes. No new migrations.
- `npm run build` passes in `frontend/`; changed backend modules load with `node -e "require(...)"`.
