# Active Task: Close a banned member's open postings automatically

## Implementation Objective

When a member is banned, close what they offer to others so nobody keeps applying to,
ordering from, buying from or hiring a banned account, and return any credits those
postings were holding. Live contracts stay for staff to resolve through a dispute.

## Acceptance Criteria

- [x] Every ban path (Users desk, dispute conviction, report sanction) runs the clean-up
      from `updateAccountStatus` after the ban is saved.
- [x] Open and paused jobs close: open applicants' proposal fees are refunded and their
      proposals closed; with no applicants the posting fee is refunded.
- [x] Unsigned job offers where the banned member is either side are withdrawn through the
      normal reject path; the client's escrow returns to their Account Wallet.
- [x] Gigs close and their unconfirmed orders are cancelled (no credits are held yet).
- [x] Approved and pending marketplace listings are delisted; buyers keep their licenses.
- [x] The banned member's pending proposals and gig orders are withdrawn.
- [x] Each item is its own transaction; failures are reported, never undo the ban.
- [x] Staff response and the `ACCOUNT_BAN_CLEANUP` activity row say what closed and how many
      live contracts are left for staff. The member gets one notice.
- [x] Offer rejection no longer credits the client when the escrow debit did not happen.
- [ ] Typecheck (user runs `pnpm typecheck`).
- [ ] Backend restarted.
