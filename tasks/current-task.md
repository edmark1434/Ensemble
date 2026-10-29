# Active Task: Freeze contract dispute escrow and filer-only notes

## Implementation Objective

When a contract/transaction dispute opens, freeze remaining escrow and let only the filer add information until staff make the case public.

## Acceptance Criteria

- [x] Opening a contract dispute tags related credit transactions and stores remaining escrow on the dispute.
- [x] Milestone release, refund, cancellation, and auto-approve cannot move frozen credits.
- [x] Hidden disputes: only the initiator can send more information to staff.
- [x] Public disputes: both parties can talk; other members cannot comment.
- [x] Live types are Contract and Transaction only (`1827500000000_dispute-contract-transaction-types`).
