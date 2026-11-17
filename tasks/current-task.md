# Active Task: Appeal page redesign and fixes (`/account/appeal`)

## Implementation Objective

Make the appeal page (`frontend/src/pages/user/account/AccountAccessPage.tsx`) match the current Ensemble UI
(`dark-base` / `dark-surface` tokens, Plus Jakarta Sans, blue primary buttons, no gradients) and fix its functional lapses.

## Acceptance criteria

- Uses the theme tokens and controls of the rest of the member site; responsive down to phone width.
- The appeal form is hidden when the member already has an open appeal (backend returns 409); the open appeal is shown instead.
- The form is hidden when there is no active penalty (backend returns 400).
- Optional Case ID and supporting-evidence fields are sent (`fields.case_id`, `fields.evidence`); inline field errors.
- Appeal subject/description length is validated on the backend too (subject ≤ 200, description 10–5,000, evidence ≤ 2,000).
- Banned, locked and suspended members cannot reply on non-appeal tickets in the UI (backend already returns 403).
- Opening a ticket or dispute shows loading and error states and ignores stale responses.
- Staff replies show up without a reload (poll while the page is visible).
- Opening the page no longer scrolls the window to the thread; only the thread scrolls.
- Appeal decisions (accepted / denied / denied permanently) are shown on the ticket.
- Copy is accurate per penalty (accepted appeals do not lift warnings).

## Status: Implemented — awaiting user verification (`pnpm typecheck`).
