# Active Task: Fix Subscription Upgrade/Downgrade Lifecycle and Inactive Recurring Plan Handling

## Implementation Objective

Diagnose and resolve subscription lifecycle issues:
1. "Payment Issue: Plan is inactive" when confirming plan downgrade:
   - Root Cause: In Xendit, recurring plans transition to `INACTIVE` upon deactivation (cancellation), failed cycles, or completion, and cannot be reactivated or patched. Calling `PATCH /recurring/plans/${xendit_plan_id}` threw an unhandled error with `{ message: "Plan is inactive" }`, which crashed downgrade requests with HTTP 400.
   - Fix: Wrap the Xendit PATCH call in its own try/catch in `updateSubscriptionPayment` (downgrade). If Xendit reports that the plan is inactive, log the warning, clear `xendit_plan_id: null` in the database, and proceed with the local subscription update so downgrades always succeed.
2. "Cancels at period end: Cancellation is scheduled" appearing after upgrading from Premium to Business:
   - Root Cause: When a subscription with `cancel_at_period_end = true` was upgraded to Business, `updateSubscriptionPayment` and `xenditWebhookHandler` only updated `plan_id`, `payment_token_id`, and `status: 'ACTIVE'`. They never reset `cancel_at_period_end: false` or cleared `canceled_at: null`, leaving the new Business plan in a scheduled-for-cancellation state.
   - Fix: Explicitly reset `cancel_at_period_end: false`, `canceled_at: null`, and recalculate `next_billing_at` and `current_period_end` on upgrades and downgrades across both immediate response and webhook handlers.
3. Cancellation handling improvements:
   - In `cancelSubscription`, allow subscriptions without `xendit_plan_id` to cancel locally instead of failing with 409.
   - Catch Xendit deactivation errors gracefully if the recurring plan in Xendit was already inactive.

## Status: Completed
- Syntax verified with `node -c backend/services/PaymentServices.js`.
- User verification preference preserved (no verification commands run).
