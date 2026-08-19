# Credits, Subscriptions, Checkout, and Transactions

Routes: `/credits`, `/credits-subscriptions`, `/credits/checkout`, `/transactions`

Sources:

- `frontend/src/pages/user/13_creditsshop/CreditsShop.tsx`
- `frontend/src/pages/payment/checkout.tsx`
- `frontend/src/pages/user/11_transactionhistory/main.tsx`
- `frontend/src/components/nav/Settings/user_settings_wallet.tsx`

## Credits

The credit shop allows an authenticated user to select an available credit package or supported top-up amount. Payment processing is handled by the backend and configured payment provider; the frontend must not be treated as the authority for price or credited quantity.

## Checkout

Checkout directs the user through the applicable payment flow. A payment may remain pending while the provider processes it. Successful top-up settlement updates the wallet and transaction history after durable backend processing.

## Transactions

`/transactions` displays the user's credit transaction history. Marketplace purchases, eligible transfers, fees, cashouts, refunds, and top-up fund transfers appear according to completed backend records.

## Credit transaction types

The backend ledger uses these business categories:

- Fund Transfer: credits moved between wallets, including completed top-up credits
- Escrow Hold: credits reserved for protected work or a dispute
- Escrow Release: held credits released to the eligible destination
- Escrow Refund: held credits returned through the escrow workflow
- Asset Purchase: buyer payment for a marketplace asset
- Asset Refund: reversal associated with an eligible asset refund workflow
- Fee: a platform fee linked to its related transaction where applicable
- Cashout: credits submitted for an external payout
- Cashout Refund: credits returned after an unsuccessful or reversed cashout

The presence of a UI label is not proof that a transaction completed. Durable `credit_transactions` records and wallet state are authoritative.

## Wallets

Accounts and teams use their applicable platform wallets. Wallet status can affect whether a transfer, purchase, or payout is allowed. Balance validation and locking occur on the backend for financial mutations.

## Marketplace purchases and fees

For an asset purchase, the buyer is charged the listing price. The creator receives proceeds after the configured marketplace fee, and the fee is recorded separately when applicable. The exact fee must come from the current backend configuration and transaction response.

## Escrow

Contracts and disputes can use escrow holds, releases, or refunds. Only authorized workflow transitions may move held credits. Documentation chat cannot release escrow.

## Cashouts

An eligible verified user can submit a cashout through the supported payout workflow. The backend validates the wallet and configured minimum, records the debit, tracks provider status, and restores credits through a cashout-refund record when the supported failure/refund path applies.

## Top-up settlement

A successful top-up must atomically mark the payment and top-up paid, credit the account wallet, create one Fund Transfer ledger record, and persist a notification. Duplicate provider events must not credit the wallet more than once.

## Subscriptions

`/credits-subscriptions` opens the credit shop's subscription view. The database-generated **Current Ensemble Plans** knowledge source is authoritative for current plan names, prices, billing periods, and trial periods. Do not guess plan details that are absent from that current source.

## Payment support

For a payment that is paid but missing from wallet or transaction history, direct the user to `/landing/SubmitATicket`. Do not claim to retry, refund, or modify a payment from documentation chat.
