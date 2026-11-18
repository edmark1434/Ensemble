# Active Task: Subcontractor Verification Badge & Unverified Dimming

## Editor workspace integration follow-up

- Sort Workspace tasks by priority, then status, then earliest due date, with undated tasks last within each group.
- Picker positioning objective: keep the calendar and color panels inside the visible viewport, detaching from their fields at screen edges. Apply bounds during opening, dragging, scrolling, layout changes, and viewport resizing; preserve picker layouts.
- Current objective: selecting today defaults the selected endpoints to ten minutes from now; entering a past time today automatically snaps forward to the next minute, matching the API's strictly-future validation.
- Acceptance: apply to both start and end time, retain future-day time choices and the existing picker layout, and cap the suggestion at 23:59 near midnight (saving remains unavailable when no future minute remains today).
- Objective: restore editor task updates after the merge and follow the main site's scheduling API.
- Acceptance: the internal editor controller resolves an exported service, checks assignment, and delegates to the shared task update service with realtime updates.
- Acceptance: date edits include time, send only changed timestamps, use CLEAR to remove dates, and respect the shared future-date and ordering rules.
- Implemented in TeamProjectServices and the editor Workspace panel. Scheduling and priority edits are available on locked tasks as allowed by the shared repository. Status edits retain the milestone lock.
- Verification commands were not run, per repository instructions.

## Implementation Objective

Update the subcontractor search and nomination flow in `frontend/src/pages/user/3_teams/team_modals/SubcontractProposalModal.tsx` (and enforce in `backend/repositories/TeamProjectRepositories.js`) so that:
- Verified platform specialists display the verified badge (`/icons/verification/lvl2_verified.png`) in search results and selected candidate cards.
- Unverified specialists still appear in search results, but are visually dimmed (`opacity-50`, `cursor-not-allowed`), cannot be selected, and clearly indicate why they are disabled (not verified on the platform).
- Backend `createSubcontractProposal` rejects unverified candidates with a `422` error.

## Acceptance Criteria

- Verified specialists show the verified badge in the search dropdown and selected candidate list and can be added.
- Unverified specialists remain visible in search results, appear dimmed, cannot be clicked/added, and display a clear "Not verified on platform" / "Unverified" indicator explaining why.
- Search dropdown and candidate list use Glide-style listbox styling with a thin vertical scrollbar (`gs-listbox-scroll` / `scroll-thin`), and the milestone scope selector uses `GlideSelect`.
- Subcontracting terms note reminds the lead to know who they are subcontracting to and that the owner must confirm the invitation after inviting.
- Backend `createSubcontractProposal` validates `verifications.is_verified = true` for every candidate.
- No builds, type checks, lint, or other verification commands run unless explicitly requested.
