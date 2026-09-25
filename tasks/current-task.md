# Current Task — Fix Free Trial Display, Subscription Upgrade/Downgrade, and Top-up via Payment Method

Resolve three issues reported by the user:
1. Subscription free trial indication and display for new users
2. Subscription upgrade and downgrade errors
3. Credit top-up using saved payment method error

## Root Causes Identified
1. **Free Trial Display for New Users**:
   - `CreditsShop.tsx` hardcoded the free plan UUID check to `sub.plan_id === "75e5c586-eab8-4954-ac14-9874d5429b68"`. In reality, the database uses dynamically generated UUIDs (`1b7d13d2-87ef-4da8-b8ad-175f4b6a1c57`).
   - Consequently, `isFreePlan` and `isOnFreePlan` evaluated to `false` for every new user, suppressing the `7-Day Free Trial` badge, suppressing trial eligibility, and preventing the checkout from starting a free trial.
   - `UserSettingsSubscriptionDetails` and `getSubscriptionPlanDetailsByUserIdRepositories` did not return or display trial periods for active trials.
2. **Subscription Upgrade and Downgrade Errors**:
   - In `updateSubscriptionPayment` (downgrade) and `xenditWebhookHandler` (upgrade), PATCH requests to `https://api.xendit.co/recurring/plans/{id}` included the immutable `schedule` field (with interval and past/null anchor date `1970-01-01`). Xendit's API rejects `schedule` in PATCH with 400 Bad Request, causing upgrades and downgrades to fail.
   - In `updateSubscriptionPayment` (upgrade), when payment succeeded immediately (e.g. card without 3DS), the backend did not update the subscription or patch Xendit's recurring plan.
   - In downgrade, line 1670 kept the old plan ID rather than updating/scheduling the new plan ID.
3. **Credit Top-Up Using Payment Method Error**:
   - `TopUpPaymentByPaymentMethod` attempted to reuse previous pending `reference_id`s from `getPaymentCheckOutByPayload`, leading to PostgreSQL `duplicate key value violates unique constraint "payments_reference_id_key"` upon calling `createTopUpPaymentSession`.
   - `country: "PH"` was missing from the Xendit payment request payload.
   - When the transaction succeeded immediately, `settleSuccessfulTopUp` was never invoked, leaving the user without their purchased credits until/unless a webhook arrived.
   - When a transaction failed or errored, the request either hung or swallowed the exact error message.

## Acceptance Criteria
- [x] Fix free plan detection and trial eligibility in `CreditsShop.tsx` by matching against fetched plans (`price === 0` or name `free`).
- [x] Update `checkout.tsx` to handle trial button text, summary details, and display trial info accurately.
- [x] Update `getSubscriptionPlanDetailsByUserIdRepositories` and `user_settings_subscriptiondetails.tsx` to display trial status and days remaining when in a trial.
- [x] Fix `updateSubscriptionPayment` for upgrades to immediately apply plan updates upon successful payment, and remove `schedule` from all Xendit recurring plan PATCH requests.
- [x] Fix `updateSubscriptionPayment` for downgrades by removing immutable `schedule` and updating plans correctly.
- [x] Fix `TopUpPaymentByPaymentMethod` to use unique `reference_id`, pass `country: "PH"`, immediately settle successful charges, and return friendly error messages.
- [x] Verify frontend build (`npm run build`).
- [x] Verify backend functionality and syntax checks.
