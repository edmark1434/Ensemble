# Credits, Subscriptions, Wallet, Cashouts, and Transactions

Routes: `/credits`, `/credits-subscriptions`, `/credits/checkout`, `/transactions`, `/settings`

Platform credits are used across Ensemble for funding job and gig contract milestones, posting jobs or submitting proposals when applicable, buying marketplace assets, and transferring funds. For live credit values, active credit packages, platform fees, minimum payout thresholds, and subscription plan prices, always check the **Current Ensemble Platform Settings** and **Current Ensemble Plans** documents.

## Buying credits and subscriptions

- **Credit Shop (`/credits` and `/credits-subscriptions`):** Browse available credit top-up packages and subscription plans (Free, Premium, Business).
- **Checkout (`/credits/checkout`):** Complete payments for selected credit packages or subscription upgrades. When upgrading mid-cycle, prorated pricing may apply depending on your remaining billing period.
- **Managing Subscriptions:** View your active plan, trial status, renewal date, or cancel renewal from the Subscription tab in `/settings` or on `/credits-subscriptions`.

## Account wallet, escrow, and credit transfers

In the Wallet tab of `/settings`, you can view:

- **Account Wallet:** Your available credits for purchases, hiring, transfers, and eligible cashouts.
- **Escrow Wallet:** Credits currently held in escrow for active contracts or open disputes.
- **User Transfers:** Transfer credits directly from your Account Wallet to another Ensemble member by searching their name or handle.

## Withdrawing earnings (Cashout)

Verified users can withdraw eligible credits from the Wallet tab in `/settings`:

- **Supported payout methods:** **GCash** and **Maya**.
- **Requirements:** You must have completed personal Identity Verification (KYC), meet the minimum payout credit requirement, and have an Account Standing that allows cashouts (cashouts are paused while suspended, locked, banned, or in the Frozen Platform Merit band-though your balance is never seized).
- **Cashout statuses:** Requests move through `PENDING` / `PROCESSING` to `SUCCEEDED`, or `FAILED` / `REJECTED` / `REVERSED` (in which case credits are restored via a Cashout Refund).
- Check the Current Ensemble Platform Settings document for current withdrawal fees and minimum payout amounts.

## Transaction history and refunds

Route: `/transactions`

Your Transaction History logs every wallet movement across categories including **Credit Top-Up**, **Fund Transfer**, **Credits On Hold (Escrow Hold)**, **Credits Released (Escrow Release)**, **Credits Refunded (Escrow Refund)**, **Asset Purchase**, **Asset Refund**, **Cashout Payout**, **Cashout Refund**, and **Platform Fee**. You can filter by tab (All, Credits, Assets, Transfers, Fee, Summary), search, and inspect details.

If a payment completed externally but does not appear in your wallet or `/transactions`, or if a cashout is stuck, file a ticket on `/support/ticket` under **Billing -> Credits and balance** or **Payouts and withdrawals** with the payment time and receipt ID.
