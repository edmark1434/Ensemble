# Active Task: Staff console UI polish and motion

## Implementation Objective

Make the Admin console (and the moderator consoles that share its shell) feel dynamic and professional with
light, non-janky motion, and fix layout/data lapses found in the scan.

## Acceptance criteria

- Phones get navigation: top bar + slide-in drawer (`ConsoleSidebar`); desktop sidebar has an animated active
  indicator, solid active state (no gradient), and a signed-in footer.
- First page loads show a layout-matching skeleton instead of a full-screen spinner (14 pages + `StaffOutlet`).
- Motion: page fade, staggered content rise, modal fade/pop, press/hover feedback, bar grow, count-up KPIs.
  Only opacity/transform; ends on `transform: none`; disabled under `prefers-reduced-motion`.
- Dashboard: clickable KPI cards that deep-link to the right tab, alert cards, live auto-refresh every 60 s
  while visible, activity timeline, proportional breakdown bars.
- Dashboard data fixes: the "Credits leaderboard" listed the newest signups and printed the join time twice;
  it now lists the members holding the most credits (linking to their wallet). "Credits in circulation"
  now includes held credits. The verification queue's always-empty Credits column is replaced by account type.

## Status: Implemented — awaiting user verification (`pnpm typecheck`).

---

# Previous task (another session): Dispute resolve flow (staff dispute modal)
# Active Task: Fix Subscription Upgrade/Downgrade Lifecycle and Inactive Recurring Plan Handling

## Implementation Objective

Fix the staff dispute detail modal (`ModeratorDisputeDetailModal`) used by Admin and Support Moderator:
close the dispute view automatically once a case is resolved, make resolution notes save and show
reliably, and let staff settle frozen escrow by milestone, by amount, or both.

## Changes

- Every closing decision (record outcome, settle escrow, reverse transaction, permanent ban, dismiss)
  closes the modal on success and refreshes the desk list. Non-closing actions apply the PATCH/POST
  response to the form instead of a full reload.
- "Save changes" sends only changed fields (status, priority, resolution notes), so an unchanged
  status cannot block a notes edit; toast says "Resolution notes saved".
- Dismiss now has an optional resolution notes field (prefilled from the sidebar) and sends it; before,
  notes were dropped on dismiss.
- Settle escrow: split method **By milestone** / **By amount** / **Both**.
  - By milestone: each unpaid milestone (status not completed/cancelled/abandoned, credits > 0) is
    "Refund client" or "Release to freelancer". Freelancer = picked total; client = the rest.
  - Both: picked milestones plus an extra amount (0..escrow − picked) to the freelancer.
  - By amount: the existing client/freelancer split.
- Backend `settle_escrow` accepts `splitMethod` + `milestoneIds`, validates them inside the settlement
  transaction (on the contract, unpaid, fit in escrow, freelancer share matches), logs them in the
  `DISPUTE_ESCROW_SETTLED` activity metadata, and lists them in the ruling message.
- Approved milestones can never be refunded. Each case-file milestone has an `escrowState`:
  `open` (staff choose), `approved` (completed but credits still in escrow: locked to the freelancer,
  a minimum freelancer share in every split mode, enforced on the server as
  `APPROVED_MILESTONE_NOT_REFUNDABLE`), `paid` (already paid out of escrow: shown locked, can't be
  picked), or `closed`.

## Acceptance criteria

- Resolving by any path closes the modal, the case shows Closed in the list, and reopening the case
  shows the saved resolution notes.
- Editing notes on an open or closed case and pressing Save changes persists them.
- Dismiss with notes stores the notes and posts them in the dismissal message.
- Milestone and Both splits always total the remaining escrow; the server rejects milestone picks that
  are not on the contract, already settled, or larger than escrow.
- No split (milestone, amount or both) can refund an approved milestone to the client. Approved-but-unpaid
  milestone credits always go to the freelancer, and already-paid milestones show as locked.

## Status: Implemented — awaiting user verification (`pnpm typecheck`).
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
