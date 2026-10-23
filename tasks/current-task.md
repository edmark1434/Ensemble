# Current Task: Remove Category and Location Display Under About Tab in Teams

## Objective
Remove the category and location display under the "About" tab in Teams so that the About card focuses cleanly on the team description.

## Changes Completed
1. **Frontend Component ([`SelectedTeam.tsx`](file:///c:/Capstone/Ensemble/frontend/src/pages/user/3_teams/SelectedTeam.tsx))**:
   - Removed the `<p>` element displaying `Category: {team.category || "—"} · Location: {team.location || "—"}` under the `active === "about"` tab.
   - The About card now cleanly displays the title and team description.

2. **Verification**:
   - Verified clean compilation with `npm --prefix frontend run build` (`tsc --noEmit && vite build`) — succeeded with 0 errors.

## Acceptance Criteria
- [x] Category and location are removed from the About tab in Teams.
- [x] About tab displays the team description cleanly.
- [x] Frontend builds with zero errors (`npm run build`).
