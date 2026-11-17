# Active Task: Dispute resolve flow (staff dispute modal)

## Implementation Objective

Fix the staff dispute detail modal (`ModeratorDisputeDetailModal`) used by Admin and Support Moderator:
close the dispute view automatically once a case is resolved, make resolution notes save and show
reliably, and let staff settle frozen escrow by milestone, by amount, or both.

## Changes

- Every closing decision (record outcome, settle escrow, reverse transaction, permanent ban, dismiss)
  closes the modal on success and refreshes the desk list. Non-closing actions apply the PATCH/POST
  response to the form instead of a full reload.
- "Save changes" sends only changed fields (status, priority, resolution notes), so an unchanged
  status cannot block a notes edit; toast says "Resolution notes saved".
- Dismiss now has an optional resolution notes field (prefilled from the sidebar) and sends it; before,
  notes were dropped on dismiss.
- Settle escrow: split method **By milestone** / **By amount** / **Both**.
  - By milestone: each unpaid milestone (status not completed/cancelled/abandoned, credits > 0) is
    "Refund client" or "Release to freelancer". Freelancer = picked total; client = the rest.
  - Both: picked milestones plus an extra amount (0..escrow − picked) to the freelancer.
  - By amount: the existing client/freelancer split.
- Backend `settle_escrow` accepts `splitMethod` + `milestoneIds`, validates them inside the settlement
  transaction (on the contract, unpaid, fit in escrow, freelancer share matches), logs them in the
  `DISPUTE_ESCROW_SETTLED` activity metadata, and lists them in the ruling message.
- Approved milestones can never be refunded. Each case-file milestone has an `escrowState`:
  `open` (staff choose), `approved` (completed but credits still in escrow: locked to the freelancer,
  a minimum freelancer share in every split mode, enforced on the server as
  `APPROVED_MILESTONE_NOT_REFUNDABLE`), `paid` (already paid out of escrow: shown locked, can't be
  picked), or `closed`.

## Acceptance criteria

- Resolving by any path closes the modal, the case shows Closed in the list, and reopening the case
  shows the saved resolution notes.
- Editing notes on an open or closed case and pressing Save changes persists them.
- Dismiss with notes stores the notes and posts them in the dismissal message.
- Milestone and Both splits always total the remaining escrow; the server rejects milestone picks that
  are not on the contract, already settled, or larger than escrow.
- No split (milestone, amount or both) can refund an approved milestone to the client. Approved-but-unpaid
  milestone credits always go to the freelancer, and already-paid milestones show as locked.

## Status: Implemented — awaiting user verification (`pnpm typecheck`).
