# Active Task: Fix Guest Mode 401 Error on Projects Page

## Implementation Objective

Prevent `Projects.tsx` from calling authenticated `/api/projects` endpoints (and triggering `/api/users/refresh-token` 401 responses and the `"Unable to refresh projects. Please try again."` error banner) when the user is in Guest mode or before an authenticated session is resolved.

## Acceptance Criteria

- In `frontend/src/pages/user/2_projects/Projects.tsx`, `loadProjects` resets project lists, clears `loadError`, stops loading/refreshing, and returns early when `isGuestMode` is `true`.
- `loadProjects` and the refresh `useEffect` return early without calling `/api/projects` or registering visibility/focus/interval polling when `!user?.account_id` or `isGuestMode` is `true`.
- No builds, type checks, lint, tests, or other verification commands run.
