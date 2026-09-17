# Current Task — Remove Claim Credits from Completed Tasks and Archived Tab

Remove the "Claim Credits" button, modal, and handler from the Delivery Dashboard (all tabs: My Tasks, To Review, Archived) for completed jobs and gigs, because contract completion already transfers funds automatically from escrow to the account wallet.

## Acceptance Criteria

- [x] Remove "Claim Credits" button from `frontend/src/pages/user/8_dashboard/dashboard_components/DashboardTaskList.tsx`.
- [x] Remove `onClaimCredits` prop and references from `DashboardTaskList.tsx`.
- [x] Remove `ClaimCreditsModal` import, state (`claimModalOpen`, `claimTarget`), and modal render from `frontend/src/pages/user/8_dashboard/dashboard_main.tsx`.
- [x] Ensure contract type badge properly reflects 'Gig' or 'Job' in `DashboardTaskList.tsx`.
- [x] Verify frontend build completes without errors (`npm run build`).

Status: Completed
