# Active Task: Dispute flow audit, scheduled payouts, and live sync

## Implementation Objective

Close the gaps found in the dispute flow (money, decisions, realtime sync, swap),
and change money rulings so recipients are paid on a schedule: 7 days after the
ruling by default, or immediately / on a staff-chosen date.

## Acceptance Criteria

### Scheduled payouts
- [x] Settle escrow and reverse transaction create `dispute_payouts` rows instead of
      paying instantly. Default release is 7 days after the ruling; staff may pick
      "Pay now" or a date (up to 90 days out).
- [x] Credits stay locked in escrow until release. Contract escrow stays frozen while
      a payout is scheduled.
- [x] A background job releases due payouts. Payouts pause while the case is reopened.
- [x] Staff (Admin or assigned Support) can release now, change the date, or cancel the
      ruling (case must be reopened first; returns any held credits).
- [x] Each step posts a ruling card in the discussion, notifies the recipients, and
      broadcasts the new state.

### Money flaws
- [x] Settlement must allocate all remaining escrow (no stranded credits) and ends the
      contract (unfinished milestones cancelled), so milestones can't be paid twice.
- [x] Settlement takes credits from the escrow wallets that actually hold them (also
      covers disputes on Pending Signature contracts).
- [x] Reversals cannot touch credits still in escrow (use settle) and never send credits
      back into escrow; an escrow payout reversed goes to the other contract party.

### Decisions and sync
- [x] Generic status edits cannot close or reopen a case (Resolve / Reopen only).
- [x] Approve does not reopen a closed case; dismiss keeps a private case private and
      posts its decision; ban requires an open case; resolve is race-safe.
- [x] `disputeUpdated` reaches staff with the case open; staff modal, member pages and
      the public page refetch on it (claim/release/reassign included).
- [x] Resolve / reopen previews come from the server text.

### Swap
- [x] Swap posts a "Parties swapped" ruling card in the discussion (already present;
      verify), and member views refresh roles/names live after a swap.

### Verification
- [ ] Typecheck (user runs `pnpm typecheck`).
- [x] Migration `1828300000000_dispute-payouts` applied.
- [ ] Backend restarted so the payout job and new routes load.
