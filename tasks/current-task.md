# Current Task — Team Marketplace Ownership and Listings

Fix Team-owned job and gig behavior so active Team members cannot apply to or order their own Team's marketplace posts, while Team-owned posts appear on the selected Team page.

## Acceptance Criteria

- [x] A job posted by a Team is recognized as owned for every active member of that Team.
- [x] A gig posted by a Team is recognized as owned for every active member of that Team.
- [x] Team members do not see proposal/order actions on their Team's own listings.
- [x] Backend validation rejects attempts to propose to or order an active Team membership's own listing, including crafted requests.
- [x] Owner/Admin marketplace-management authority remains separate; ordinary members gain no edit, offer, wallet, or contract authority.
- [x] The selected Team Job Posts and Gig Posts tabs display posts owned by that Team.
- [x] Backend syntax checks and frontend production build pass.

Status: Completed August 31, 2026.

## Implementation Notes

Added a separate active-Team affiliation lookup for ownership and self-dealing prevention. Existing Owner/Admin actor authorization remains unchanged and continues to govern marketplace mutations. Job and gig list/detail responses now distinguish affiliated ownership from management authority. Repository-level proposal and order creation rejects listings owned by the user's personal account or any Team where the user is an active member.

Added an authenticated Team marketplace-posts endpoint using the existing controller-service-repository architecture. The Team Job Posts and Gig Posts tabs now fetch Team-account listings and render responsive, clickable cards with status, pricing, activity counts, dates, and thumbnails.

## Verification

Executed Node syntax checks for all affected marketplace actor, job, gig, and Team backend files. Executed `npm run build` in `frontend`; TypeScript and Vite production build passed. Vite reported only existing mixed static/dynamic import and large-chunk warnings. `git diff --check` reported only line-ending conversion warnings and no whitespace errors.