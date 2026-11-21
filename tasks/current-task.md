# Current Task

## Objective

1. Credits & Economy desk: show the wallet balance before and after every ledger entry, for each member or escrow wallet the entry touches.
2. Show a status on every transaction (Completed, Pending, On Hold, Delayed, Cancelled, Failed, Reversed), in the desk and the member history.
3. Dispute "Pay now": the member's open wallet views refresh as soon as a payout is paid, scheduled, rescheduled or cancelled.

## Acceptance Criteria

- `fetchLedgerBalances` (`LedgerBalanceRepositories`) rebuilds before/after from the wallet's current balance and the ledger. It applies the desk's movement rules: only Completed/Reversed rows move credits; staff adjustments use the audited delta; staff holds move spendable ↔ held. Pre-audit adjustments mark earlier balances `approximate`. Platform wallets are skipped.
- The desk ledger list, the wallet modal list, the entry modal (the entry's From/To blocks) and the CSV export show balance before → after. The overview's recent list and the entry modal's linked/group rows do not load balances.
- Desk rows show the status pill even when Completed. Staff hold rows read "Credits put on hold" / "Hold released" instead of "Escrow funded/released".
- Member history: the detail modal shows Balance Before / Balance After for the member's wallet. Dispute payouts read Pending, On Hold (case reopened), Delayed (failed) or Cancelled (ruling withdrawn, no credits moved).
- After every dispute money action and the payout job, recipients and both parties get `account:wallet_changed`. `AccountRestrictionHost` relays it as `ensemble:wallet-changed`, so Transactions and Settings → Wallet reload.

---

# Parallel task: harden and polish `/support/ticket`

## Objective

Fix the gaps in member ticket intake (`POST /api/users/tickets`, `page_SubmitATicket.tsx`) across backend validation, security and the form UI.

## Acceptance Criteria

- Intake rules live in `TicketServices.createMemberTicket`; the controller only maps results and errors (no raw database messages; unknown errors are 500).
- Members cannot set priority (type default only); the stored contact email is the account's own, never a client value.
- Unknown ticket types are rejected; subject ≤ 200 and description 10–5,000 characters for every member ticket.
- Member attachments must be files that account uploaded (consumed `upload_intents`), checked before the ticket row is written; invalid or foreign keys return 400.
- The same open ticket (account + type + subject) filed again within 10 minutes returns 409 `TICKET_DUPLICATE` with the existing ticket id.
- `POST /api/users/tickets` has the `ticketCreate` rate limit; the broken legacy `POST /api/tickets` is removed.
- Concurrent submits retry on a ticket number collision.
- The form validates before uploading, reuses the appeal attachment picker (per-type limits, remove, preview, drag and drop), does not re-upload on retry, keeps a per-account session draft, accepts `?type=`, links to a duplicate, sends appeal-only members to their appeals, shows the open-ticket count, and has labelled inputs, counters, inline errors and a "file another" reset.
