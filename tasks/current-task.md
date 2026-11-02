# Active Task: Fix Guest Mode Discovery Feed, Teams Access, and Info Tabs

## Objective

Restore and enable Guest Mode browsing across the Discovery Feed, Discover Teams, Team Profiles, and the Discovery / Job / Gig Info Tabs while requiring authentication (`GuestLoginModal`) only when a guest triggers an interactive action.

## Acceptance Criteria

1. **Discovery Feed (`GET /api/accounts/search-users`)**:
   - Fix the invalid SQL syntax (`a.(SELECT COALESCE(AVG(stars_out_of_five), 0) ...)` -> `(SELECT COALESCE(AVG(stars_out_of_five), 0) ...)`) in `backend/repositories/AccountRepositories.js` so `GET /api/accounts/search-users` returns creators for both guests and signed-in users.
2. **Guest Route Access (`frontend/src/lib/guestRouteAccess.ts`)**:
   - Allow guest navigation to `/discovery/creators`, `/discovery/teams`, `/discovery/gallery`, `/discovery/info`, `/teams/:id`, `/jobs/info`, `/jobs/proposals/flow`, `/gigs/info`, `/gigs/orders/flow`, `/gigs/orders/info`, `/jobs/postings/:id/page`, and `/jobs/:id/page`.
3. **Discover Teams & Public Team Profile (`DiscoveryTeamsTab.tsx`, `SelectedTeam.tsx`, `backend/routes/Teams.js`)**:
   - Allow guests to browse `/discovery/teams`, view team profiles at `/teams/:id` (including public team services & gallery via `optionalSession` on `GET /api/teams/:teamId/marketplace-posts`), and prompt `GuestLoginModal` only when a guest interacts (`Ask to Join`, `Add Review`, `Report Team`).
4. **Information Tabs (`DiscoveryPage.tsx`, `JobPostsInfoGuide.tsx`, `GigServicesInfoGuide.tsx`, `JobProposalsFlowGuide.tsx`, `GigOrdersFlowGuide.tsx`)**:
   - Allow guests to view `How Discovery Works` (`/discovery/info`), `Job Info Tab` (`/jobs/info`), and `Gig Info Tab` (`/gigs/info`), prompting `GuestLoginModal` on action CTAs (`Post a Job`, `Post a Service`, `View Incoming Proposals`, `View Incoming Orders`).
5. **Verification**:
   - `cd frontend && npm run build` passes with zero errors.
   - Backend syntax and `searchUserAccountsByHandle` SQL query execute cleanly.
