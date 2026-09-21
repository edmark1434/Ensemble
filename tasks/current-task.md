# Current Task — Fix Saving Payment Methods

Fix issue where payment methods cannot be saved when adding a payment method via Xendit.

## Root Causes Identified
1. **Invalid Foreign Key Constraint (`fk_cust_ref_id`)**: `payment_methods.customer_reference_id` had a foreign key constraint referencing `payments(reference_id)`. When saving a payment method without a purchase, no payment row exists, causing any non-null customer reference ID to fail with foreign key violation `fk_cust_ref_id`.
2. **Missing HTTP Response in Webhook Handler**: `paymentSessionCompleteWebhookHandler` never sent an HTTP response (`res.status(200).json(...)`), causing webhook deliveries to hang, time out, and fail.
3. **Webhook Event Routing**: The main `/api/payment/webhooks/xendit` route ignored `payment_session.completed` / `session.completed` events, treating them as normal payments and dropping them because `reference_id` was not found in `payments`.
4. **Lack of Fallback Reconciliation**: If the webhook wasn't delivered (e.g., local environment or tunnel issue), returning to the application after completing the Xendit flow did not reconcile the pending session.

## Acceptance Criteria
- [x] Create and run migration `1812800000000_167-drop-payment-methods-cust-ref-fk.js` to drop `fk_cust_ref_id`.
- [x] Create shared helper `savePaymentTokenForUser` and `savePaymentMethodFromSession` in `backend/services/PaymentServices.js`.
- [x] Update `paymentSessionCompleteWebhookHandler` to properly save the token, catch errors, and return HTTP 200.
- [x] Update `xenditWebhookHandler` to route session completion / payment token events to `paymentSessionCompleteWebhookHandler`.
- [x] Track pending save sessions in Redis in `createPaymentToken` and auto-reconcile in `getAllPaymentMethodsByUserIdService`.
- [x] Add `syncPaymentSessionController` and register route in `backend/routes/Payment.js`.
- [x] Handle return parameters in frontend (`checkout.tsx` and `CreditsShop.tsx`), persist checkout item in sessionStorage, auto-select saved method, and show success toasts.
- [x] Verify functionality with automated tests (all 7 automated integration tests passed).
- [x] Verify frontend build passes (`npm run build` succeeds with zero errors).


