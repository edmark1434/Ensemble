# Active Task: Fix Xendit Top-Up Checkout Payment Method Saving

## Implementation Objective

When users check "Save this payment method for future payments" in the Xendit checkout portal during a top-up, Xendit returned `API_VALIDATION_ERROR`.
Enable proper payment method saving in checkout sessions:
1. Restore and configure `channel_properties.cards` with `card_on_file_type: "CUSTOMER_UNSCHEDULED"` in `processTopUpPayment`.
2. Fix customer email resolution (`email_address`) and customer creation in `getCustomerPayload`.
3. Ensure webhook and session completion handlers properly capture and save the payment token/method when a customer opts to save their card during checkout.

## Acceptance Criteria

- People sharing an IP (same Wi-Fi) do not affect each other: signed-in requests count only per account (session must exist in Redis), with no IP limit; signed-out requests count per browser (signed `ens_rl` cookie) plus a high per-IP network ceiling meant only as an abuse backstop. Login/signup counts per browser plus network.
- Everyday read/write policies use one-minute windows with budgets that fit legitimate polling.
- Chat and ticket route limiters use the same Redis store and monitor instead of in-memory `express-rate-limit`.
- `TRUST_PROXY` accepts a numeric hop count; existing address-list values behave as before.
- Admin Analytics → Traffic & rate limits shows requests/429s per minute, policy limits, busiest windows (with reset), shared IPs, recent 429s, store errors, and an IP pass-through check for the admin's own request.
- Docs updated (security, api, frontend, caching). No builds, type checks or lint run (user verifies with `pnpm typecheck`).
- `processTopUpPayment` includes `channel_properties: { cards: { card_on_file_type: "CUSTOMER_UNSCHEDULED" } }`.
- `getCustomerPayload` safely reads `email_address` and provides valid customer details.
- When Xendit fires `payment_session.completed` / `payment_token.activated` or when payment completes with a saved card, the payment token is vaulted and linked to the user.
- No verification commands run (`pnpm typecheck` reserved for user).

## Implementation Status

- Fixed in `backend/services/PaymentServices.js`:
  - Uncommented and configured `channel_properties.cards.card_on_file_type = "CUSTOMER_UNSCHEDULED"` in `processTopUpPayment`.
  - Added session mapping (`user_pending_save_session:${userId}` and `save_session_user:${sessionId}`) in Redis to guarantee reconciliation when saving cards during topup.
  - Enhanced `savePaymentMethod` to also sync via `savePaymentMethodFromSession` using `payment_session_id`.
  - Fixed SQL column `email_address` and email resolution in `getCustomerPayload` and `processTopUpPayment`.
