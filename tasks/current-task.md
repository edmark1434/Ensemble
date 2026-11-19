# Task: Contracts during and after a dispute

## Implementation Objective
A disputed contract pauses instead of running on, and a ruling decides what happens to it: a settlement ends it at once, anything else resumes it with deadlines moved forward by the time spent on hold. The dispute form also says up front when a pending payout blocks a new dispute.

## Acceptance Criteria
- On hold while a dispute is open or a ruling's payout is waiting: escrow frozen (including revision purchases), and the overdue / stalled / abandoned / auto-approve / reminder / cancellation auto-approve jobs skip the contract.
- `contracts.dispute_hold_since` is set in the filing transaction and synced from `emitDisputeState` before each broadcast; a 5-minute job reconciles the rest.
- Resuming moves contract and milestone deadlines, `overdue_at`, review windows (`review_paused_for`) and cancellation auto-cancel times forward by the time each spent on hold, and notifies both parties.
- `settle_escrow` ends the contract when ruled (Closed / Cancelled, milestones and gig order cancelled, workspaces archived), snapshotting the change in `contracts.dispute_settlement_end`; `cancel_payouts` restores it exactly. Live contracts with a standing settlement are ended by the job.
- Abandoned-milestone job refunds before marking, so a failed refund retries instead of stranding escrow.
- `GET /api/contracts` returns `dispute_hold`; the contract list and page show On hold / Settled by dispute, the countdown pauses or shows the contract ended.
- Dispute form shows `DISPUTE_PAYOUT_PENDING` up front; error toasts are not cut off.
