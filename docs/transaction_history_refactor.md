# Transaction History Refactor — Implementation Prompt

## Goal

Refactor `/transactions` to replace all sample data with the authenticated user's real credit ledger. Display every `credit_transactions` row where any wallet owned by the user is either `source_wallet_id` or `destination_wallet_id`.

Supported `CREDIT_TRANSACTION` types (display these labels exactly):

- Fund Transfer
- Credit Purchase
- Escrow Hold
- Escrow Release
- Escrow Refund
- Asset Purchase
- Asset Refund
- Fee

Do not filter the ledger to `completed`; return every status and show its badge. Unknown future types/statuses must still render safely.

## Strict scope

Change transaction-history-related files only:

- `frontend/src/pages/user/11_transactionhistory/**`
- `backend/Repositories/TransactionRepositories.js`
- Transaction-specific controller/service/route files, if required (for example `TransactionControllers.js`, `TransactionServices.js`, `Route/transaction.js`)
- The minimum route registration line in `backend/Route/api.js`, only if a new transaction router is created

Do not change payment creation, wallets, migrations, seed files, global UI/components, auth middleware, or unrelated code. In particular, treat `backend/migrations/1784589177552_071-create-credit-transactions.js` as the existing schema reference; do not edit it. Preserve unrelated working-tree changes.

## Backend contract

Add one authenticated read endpoint, preferably:

`GET /api/transactions/credits`

Use the project's `checkSession` + `requireAuth` middleware and derive `accountId` from authenticated server state—never from request params/body/query.

Repository rules:

- Join `account_wallets` to find all wallets for the account.
- Match transactions when the owned wallet is the source **or** destination.
- Return each transaction once, ordered by `created_at DESC, credit_transaction_id DESC`.
- Use parameterized PostgreSQL only; repository contains database logic, service business logic, controller HTTP handling.
- Select explicit columns (no `SELECT *`).
- Do not require both wallets to belong to accounts; escrow/platform wallets may not.

Response shape:

```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "type": "Credit Purchase",
      "amountCredits": 5000,
      "status": "completed",
      "createdAt": "ISO timestamp",
      "direction": "incoming",
      "sourceWalletId": "uuid",
      "destinationWalletId": "uuid",
      "feeTransactionId": null,
      "referenceTable": null,
      "referenceId": null
    }
  ]
}
```

Direction is relative to the authenticated account:

- destination owned only → `incoming`
- source owned only → `outgoing`
- both owned → `internal`

Return normal project-style `401` for unauthenticated access and a safe `500` response without leaking database details.

## Frontend requirements

Refactor `frontend/src/pages/user/11_transactionhistory/main.tsx` (splitting into transaction-local components/types/helpers is allowed):

- Remove every `sample*` array and all totals derived from mock data.
- Fetch with the shared `@/lib/axios` client.
- Render one clear ledger covering all eight types, with columns: date/time, type, direction, credits, status, reference, and shortened transaction ID.
- Prefix incoming with `+`, outgoing with `-`, and internal with no sign. Keep `amountCredits` non-negative.
- Add filters for type, status, direction, and the existing date range; add a reset action.
- Make pagination operate on the filtered rows and reset/clamp the page whenever filters or row count change.
- Compute summary totals from fetched rows. Count only `completed` transactions in settled incoming/outgoing totals; show non-completed escrow holds separately. Never count `internal` as incoming or outgoing.
- Include accessible loading, empty, and error states with a retry button.
- Preserve the existing dark visual style, responsive table/overflow behavior, user header, and `/credits` purchase navigation.
- Use semantic buttons/labels, keyboard focus styles, and no mojibake characters.
- Do not invent package, payment-method, asset, seller, customer, or project names when the API does not provide them. Show a neutral em dash for missing reference data.

## Acceptance checks

- All eight transaction types can display without special-case crashes.
- Source-side and destination-side transactions appear once with the correct sign/direction.
- Pending/failed/refunded statuses remain visible.
- Date/type/status/direction filters combine correctly.
- Loading, empty, error/retry, responsive layout, and pagination work.
- No hardcoded transaction records or wallet/account IDs remain.
- No file outside the strict scope is modified.
- Run `npm run build` in `frontend` and report any pre-existing failures separately.

## Delivery

Implement the change, verify it, then report: files changed, endpoint/response shape, checks run, and any limitation caused by data absent from the current schema.
