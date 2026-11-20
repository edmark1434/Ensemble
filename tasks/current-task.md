# Task: Contracts during and after a dispute

## Implementation Objective
A disputed contract pauses instead of running on. A settlement ruling ends it at once. Any other outcome asks both parties whether to continue or end the contract; continuing needs both, ending needs one, and if nobody ends it in 72 hours it continues. A continued contract can be disputed again.

## Acceptance Criteria
- On hold while a dispute is open, a ruling's payout is waiting, or the continue-or-end question is pending: escrow frozen (including revision purchases) and the deadline / auto-approve / reminder / cancellation auto-approve jobs skip the contract.
- `settle_escrow` ends the contract when ruled (snapshot in `contracts.dispute_settlement_end`, withdrawn cancellation requests included); `cancel_payouts` restores it exactly.
- Case closed without ending the contract → `contract_dispute_decisions` row, `CONTRACT_DECISION_NEEDED` notice to both, prompt on the contract page, card and contracts-list banner; 24 h reminder.
- `POST /api/contracts/:id/dispute-decision` `{ choice }`: both continue → resume (clocks moved forward by the hold) and a new dispute round; either ends → cancellation rules in the same transaction; deadline passes → auto-continue.
- Filing returns `DISPUTE_DECISION_PENDING` while the question is open; after continuing, earlier disputes no longer count toward one-per-side.
- A reopened case or an otherwise ended contract supersedes the question (notice on reopen); a stale choice closes it without acting; a deleted case resumes without asking.
- The client cannot end while work delivered before the question opened awaits review (`REVIEW_PENDING_WORK`); approving stays possible during the question; the freelancer's end dialog warns about their unapproved work. Both continuing withdraws a pre-dispute cancellation request.
- Staff dispute detail shows "Contract after this case" (`contractAfterCase`).
- Cancellation request accept / auto-approve no longer leave a request approved when the cancellation itself fails; abandoned-milestone job refunds before marking.
