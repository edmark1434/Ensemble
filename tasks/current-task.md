# Current Task: Fix Drawer Exit & Sidebar Obscuration Bug

## Objective
Prevent the tour from leaving the detail drawer open when transitioning from `Exit Detail View` to the next step (`Orders Tab` or `Proposals Tab`), ensuring the modal backdrop is dismissed and the sidebar is fully visible and clickable.

## Acceptance Criteria
- [x] Fixed drawer dismiss on interactive card click in `TourSpotlightCard.tsx`: clicking "Click highlighted element" on `gigs_detail_exit` or `jobs_detail_exit` explicitly triggers the exit pill click / drawer dismiss before advancing.
- [x] Handled route navigation in `PlatformTour.tsx`:
  - When transitioning from `gigs_detail_exit` to `gigs_orders` (or `jobs_detail_exit` to `jobs_proposals`), directly navigates back to base route (`/gigs/services` or `/jobs/postings`) to unmount the drawer modal.
  - In sidebar synchronization, if the current route is still inside an item sub-route (`/gigs/services/:id` or `/jobs/postings/:id`), automatically navigates to base route so the backdrop does not obscure sidebar navigation.
- [x] Added automated lingering drawer cleanup in `TourSpotlightCard.tsx`: if the tour advances to `gigs_orders` or any subsequent section while a detail drawer exit pill is still in the DOM, programmatically clicks the exit pill to remove the backdrop.
- [x] Verified `npm --prefix frontend run build` completes with 0 errors.
