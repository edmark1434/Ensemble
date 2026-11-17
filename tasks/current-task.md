# Active Task: Subcontractor Verification Badge & Unverified Dimming

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
