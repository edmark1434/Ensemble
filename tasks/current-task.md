# Active Task: Dispute financial resolution

## Objective

Let Admin / assigned Support settle frozen escrow or reverse a linked completed credit transaction from the dispute desk, with fail-hard clawback and auto-close.

## Acceptance Criteria

1. Admin/assigned Support can settle remaining dispute escrow as refund, release, or split; dispute auto-closes.
2. Admin/assigned Support can reverse a linked completed txn; original becomes `Reversed`; compensating row links via `reverses_credit_transaction_id`; dispute auto-closes.
3. Insufficient destination balance returns 409 and changes nothing.
4. Double submit / second reverse is blocked by unique constraint / status checks.
5. Non-`canAct` staff cannot call the endpoint (403).
6. Frontend exposes settle/reverse only when permitted and eligible.
7. `cd frontend && npm run build` passes.
