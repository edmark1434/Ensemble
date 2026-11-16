# Active Task: Fix Workspace 429 Too Many Requests on Live Server

## Implementation Objective

Eliminate redundant and overly aggressive API fetching in the Workspace view (`TeamProjectWorkspace.tsx` and `ProjectSubmissionsTab.tsx`) so live users do not exhaust the backend `general` rate limit (600 GET requests per 15 minutes per IP) and receive `429 Too Many Requests`.

## Acceptance Criteria

- `TeamProjectWorkspace.tsx` deduplicates concurrent `loadProjectData` calls, skips rapid silent refreshes within 2 seconds, backs off silent polling for 60 seconds after a 429 response, and suppresses error toasts for silent background refreshes.
- `TeamProjectWorkspace.tsx` filters socket refreshes by `team_id` / `teamId` when present, debounces socket-triggered refreshes by 300ms, throttles `visibilitychange` refreshes to at least 15 seconds between loads, and increases fallback polling from 8s to 60s.
- `TeamProjectWorkspace.tsx` passes `loadProjectData` directly to `onTasksUpdated` and `onUpdated` without creating inline arrow functions on every 1-second timer render.
- `ProjectSubmissionsTab.tsx` removes duplicate Socket.IO listeners and avoids firing a redundant `/video-projects` request when `videoProjects` is provided by `TeamProjectWorkspace` (even when empty).
- No builds, type checks, lint, tests, or other verification commands run.
