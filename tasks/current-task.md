# Active Task: Add Subscription Cancellation and Disable Free Plan Button

## Implementation Objective

Add a cancellation button in Settings (Subscription Details tab) and in the Subscription plans tab (`/credits-subscriptions`) that triggers the backend subscription cancellation endpoint (`/api/payment/cancel-subscription`), and disable the Free plan button so it never displays an active "Subscribe Plan" action.

## Acceptance Criteria

- [x] In `UserSettingsSubscriptionDetails.tsx`:
  - Free plan card displays a disabled button (`"Free Tier"`) instead of `"Subscribe Plan"`.
  - Cancellation button is available for paid subscriptions (both `ACTIVE` and `TRIALING`) when not yet scheduled for cancellation.
- [x] In `CreditsShop.tsx`:
  - Free plan card displays a disabled button (`"Free Tier"` / disabled) rather than an active subscription action.
  - Subscription Plans tab includes an action for active/trialing paid subscribers to cancel their subscription.
  - Cancellation triggers `POST /api/payment/cancel-subscription` and updates state in real time.
- [x] In backend (`PaymentServices.js` / `SubscriptionRepositories.js`):
  - Ensure `cancelSubscription` robustly resolves the active subscription with an active recurring plan ID (`xendit_plan_id`).
