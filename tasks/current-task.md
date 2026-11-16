# Active Task: Disable Save Payment Method on Top-Up Checkout

## Implementation Objective

Set `allow_save_payment_method: "DISABLED"` in `processTopUpPayment` so that the Xendit checkout portal strictly processes top-ups as one-time payments and removes the "Save this payment method for future payments" checkbox.

## Acceptance Criteria

- `allow_save_payment_method` in `backend/services/PaymentServices.js` (`processTopUpPayment`) is set to `"DISABLED"`.
- Top-up continues to function normally as a one-time transaction.
- No verification commands run (`pnpm typecheck` reserved for user).

## Implementation Status

- Done: Updated `allow_save_payment_method: "DISABLED"` in `backend/services/PaymentServices.js`. Top-up checkout sessions will now strictly be one-time payments with the save checkbox hidden.
