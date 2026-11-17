# Active Task: Credits & Economy desk (Admin + Support Moderator)

## Implementation Objective

Rebuild Admin → Credits & Economy into an accurate, auditable operations desk for credit supply, holds,
staff adjustments, the ledger, and per-wallet investigation. Share the same desk with the Support Moderator
console, the only moderator role that may adjust or freeze credits.

## Flaws fixed

- Wallet modal's Freeze/Unfreeze button had no handler; there was no way to adjust credits anywhere in the UI.
- Staff adjustments stored `abs(delta)` with source = destination and dropped the note, so deductions were
  indistinguishable from grants and had no reason, actor, audit row, or member notice.
- "Total credits" excluded held (frozen) credits; "frozen" was also true for any suspended account.
- "Top credit buyers" ranked balances; "spent"/"revenue" were the sum of the member's own listing prices.
- Audit log: last 100 rows only, client-side filters, every row labelled "Credited", one party shown.
- Overview loaded every wallet plus up to 2000 ledger rows on each visit; no indexes on ledger wallet/date columns.
- Controller called the repository directly; API errors were always 400.

## Acceptance criteria

- `GET /api/admin/economy-overview`, `/economy/wallets`, `/economy/wallets/:walletId`, `/economy/ledger`,
  `/economy/holds` allow Admin and Support Moderator. Support never sees staff wallets or staff ledger rows.
- Overview: supply (spendable, held, escrow, platform), 30-day flow with daily series, in-flight credits
  (pending ledger, cashouts, dispute payouts), hold health, real top spenders/earners, top holders,
  recent adjustments, actionable alerts that open the right tab with filters.
- Wallets: server-side search, filters, sort and paging; hold detail; bulk freeze/release with reason.
- Holds tab: every active hold with reason, end date, who placed it, overdue/expiring flags; release with note.
- Ledger: server-side search/filters/date range/paging; both parties, direction, reference, adjustment reason;
  CSV export of the current page.
- Wallet detail: balances, hold, lifetime in/out, paginated ledger, adjust (reason required) and freeze/release.
- Adjustments: reason ≥ 5 chars, atomic `CREDITS_ADJUSTED` activity with signed delta, member notification.
- Support Moderator console has a **Credits & Wallets** page using the same desk.

## Status: Implemented — awaiting user verification (`pnpm typecheck`).
