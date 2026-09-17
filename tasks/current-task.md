# Current Task — Team Review Modal

Replace browser `window.prompt` dialogs when submitting a team review with a dedicated, styled review modal (`AddTeamReviewModal`).

## Acceptance Criteria

- [x] Create `AddTeamReviewModal.tsx` in `frontend/src/pages/user/3_teams/team_modals/`:
  - 1-5 Star interactive rating selector with hover and selection highlights.
  - Descriptive labels for selected star rating.
  - Textarea for review comment with character count limit and placeholder.
  - Form validation: Rating must be selected (1-5).
  - Submit button with loading/saving state and Cancel button.
  - Matches the project dark-mode/light-mode UI theme and modal conventions.
- [x] Update `frontend/src/pages/user/3_teams/SelectedTeam.tsx`:
  - Import `AddTeamReviewModal`.
  - Add `showReviewModal` state.
  - Replace `addReview` (which used `window.prompt`) with modal open/submit logic.
  - Pass modal props (`isOpen`, `onClose`, `teamName`, `onSubmit`).
  - Refresh reviews upon successful submission.
- [x] Verification:
  - Run `npm run build` in `frontend` to ensure zero compilation or type errors.

Status: Completed
