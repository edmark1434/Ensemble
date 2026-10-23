# Current Task: Fix Drawer Exit & Sidebar Obscuration Bug
# Current Task: Multi-Member Task Subcontracting with Client Governance & Scoped Permissions

## Objective
Prevent the tour from leaving the detail drawer open when transitioning from `Exit Detail View` to the next step (`Orders Tab` or `Proposals Tab`), ensuring the modal backdrop is dismissed and the sidebar is fully visible and clickable.
1. **Multi-Member Subcontracting Roster & Terms Acknowledgment**:
   - Enable freelancers in a project workspace to nominate one or more subcontractors/specialists under their contract.
   - For each candidate: specify role, assigned milestone under the freelancer's contract, agreed credits (optional), and granular permissions.
   - Enforce lead contractor terms of service acknowledgment: full accountability for deliverables, confidentiality/NDA compliance, and escrow budget clarity.

2. **Client Approval Governance & Bilateral Discussion**:
   - Proposed subcontractors are kept in `pending_client_approval` status and cannot access the workspace immediately.
   - Client is notified and receives a dedicated pending review banner in the project contract/members workspace with candidate details.
   - Bilateral discussion trigger allows client and freelancer to align before a decision.
   - Client has full authority to Approve or Decline candidates individually or in batch with feedback. Freelancers can withdraw pending requests.

3. **Workspace Admission, Badging & Scoped Task Permissions**:
   - Approved subcontractors join `team_members` with role `'Subcontractor'`.
   - Distinct badges (`Subcontractor · Under @freelancer`) in the project roster and taskboard.
   - Strict milestone scoping on the taskboard: subcontractors can only view and update tasks matching their assigned contract milestone; unauthorized modifications return `403 Forbidden`.

## Acceptance Criteria
- [x] Fixed drawer dismiss on interactive card click in `TourSpotlightCard.tsx`: clicking "Click highlighted element" on `gigs_detail_exit` or `jobs_detail_exit` explicitly triggers the exit pill click / drawer dismiss before advancing.
- [x] Handled route navigation in `PlatformTour.tsx`:
  - When transitioning from `gigs_detail_exit` to `gigs_orders` (or `jobs_detail_exit` to `jobs_proposals`), directly navigates back to base route (`/gigs/services` or `/jobs/postings`) to unmount the drawer modal.
  - In sidebar synchronization, if the current route is still inside an item sub-route (`/gigs/services/:id` or `/jobs/postings/:id`), automatically navigates to base route so the backdrop does not obscure sidebar navigation.
- [x] Added automated lingering drawer cleanup in `TourSpotlightCard.tsx`: if the tour advances to `gigs_orders` or any subsequent section while a detail drawer exit pill is still in the DOM, programmatically clicks the exit pill to remove the backdrop.
- [x] Verified `npm --prefix frontend run build` completes with 0 errors.
- [x] New append-only migration created for `team_subcontract_proposals` and `team_subcontract_proposal_members` (or extending `contract_subcontractors` cleanly) with both `up` and `down`.
- [x] Backend routes, controllers, services, and repositories follow separation of concerns.
- [x] Backend validates lead contractor contract ownership, client authorization on decisions, and milestone task permissions.
- [x] Realtime socket alerts or notifications emitted when proposals are submitted, discussed, or decided.
- [x] Frontend UI updated in `TeamProjectWorkspace.tsx`, `ProjectContractAndMembersTab.tsx`, and `ProjectTaskboardTab.tsx` with nomination modal, client review card, badges, and scoped task access.
- [x] Frontend builds cleanly with zero TypeScript errors (`cd frontend && npm run build`).
