# Active Task: Fix Subscription Downgrade (Business to Premium)

## Implementation Objective

Fix subscription downgrade flow across backend and frontend so that downgrading from Business to Premium works smoothly:
1. In `backend/services/PaymentServices.js`:
   - If `subscription.xendit_plan_id` is present, update the Xendit recurring plan via PATCH.
   - If `!subscription.xendit_plan_id` (e.g. test, promotional, or local plan), allow downgrading the local database plan directly without erroring.
   - Update `plan_id: planDetails.plan_id` in `updateSubscriptionBySubscriptionId` so the subscription tier actually updates in the database.
   - Ensure SQL queries reference valid columns (`email_address` on `users` table instead of non-existent `email`).
   - Return `success: true` and a valid reference/ID in the response for clean frontend reconciliation.
2. In `frontend/src/pages/payment/checkout.tsx`:
   - In `handleSubscribe`, recognize successful downgrade responses (when `response.status === 200` and `data?.message` or `data?.success` or `data?.subscriptionUpdate`) and show the success confirmation state.
   - For downgrades without a new payment method selection, do not block or disable the button; use existing or local plan update.
3. In `frontend/src/pages/user/13_creditsshop/CreditsShop.tsx`:
   - Relax `hasXenditPlan` requirement on `isFreePlan` check so paid users with `xendit_plan_id = null` are not falsely identified as free plan users.
   - Accurately display "Downgrade to [Plan]" buttons and badges for lower tier plans.

## Status: Completed

All acceptance criteria satisfied:
- Downgrade button correctly triggers downgrade checkout item.
- Downgrade request succeeds locally and via Xendit if recurring plan exists.
- Database records updated `plan_id`.
- User verification preference preserved (no automatic verification commands run).
