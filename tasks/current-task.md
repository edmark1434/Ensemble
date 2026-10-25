# Active Task: Fix Proposal List Clutter, Status Stepper Mismatch, and Unshortlist Persistence

## Implementation Objective
1. **Fix Unshortlist State Persistence**:
   - Backend `JobRepositories.updateProposalStatusRepositories`: Reset `shortlisted_at = NULL` when status transitions back to `'Pending'`.
   - Clean up existing DB rows where `status = 'Pending'` and `shortlisted_at IS NOT NULL`.
   - Frontend `proposals_view_details_as_author.tsx`: Rely strictly on `proposal.status === 'Shortlisted'` rather than truthy historical `shortlistedAt` timestamp.
2. **Fix Status Stepper Mismatch**:
   - In `proposals_list.tsx` (both List and Grid views), derive stepper stages strictly from current `item.status`.
   - Stage 01 (`PENDING`): Active only for Pending (or completed for later stages).
   - Stage 02 (`SHORTLISTED`): Active only if proposal is actually Shortlisted, Accepted, or Hired.
   - Stage 03 (`ACCEPTED`): Active for Accepted/Approved or Hired.
   - Stage 04 (`HIRED`): Active for Hired.
   - Terminal state for Rejected / Withdrawn.
   - Prevent stepper wrapping onto a second line.
3. **De-clutter Proposal List Cards**:
   - Header row: Single line alignment (`justify-between`) so status badge never wraps awkwardly below the username.
   - Job subtitle: Streamline metadata (`For: Job Title • by Client • Role`).
   - Team members: Compact avatar stack (`-space-x-1.5`) with single-line `Leader (Leader) + X more` instead of multiple wrapped badges.

## Acceptance Criteria
- [ ] Unshortlisting a proposal sets status to `Pending` and clears `shortlisted_at`.
- [ ] On page reload/refresh, an unshortlisted proposal stays `Pending` and does NOT display as Shortlisted.
- [ ] Stepper in list and grid views matches the status badge (e.g. `PENDING` proposal shows only Stage 01 active, Stage 02 star is gray/unfilled).
- [ ] Stepper does not break/wrap onto 2 lines.
- [ ] Card layout is clean, compact, and free of unnecessary badge wrapping.
- [ ] Frontend builds cleanly with zero errors (`npm run build`).
- [ ] NO commits made without user instruction.
