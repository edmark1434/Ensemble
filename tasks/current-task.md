# Current Task: Accepted Gig Order 24-Hour Confirmation Timer, < 2h Reminder & Merit Policy Notice

## Objectives
1. **< 2-Hour Confirmation Reminder Notification (`GigRepositories.js`, `GigServices.js`, `BackgroundJob.js`, `notificationTypes.tsx`)**:
   - In `expireStaleAcceptedGigOrders` (`backend/repositories/GigRepositories.js`), detect any `Accepted` gig order with less than 2 hours remaining on its 24-hour confirmation window (`gr.updated_at <= NOW() - INTERVAL '22 hours' AND gr.updated_at > NOW() - INTERVAL '24 hours'`) that has not yet received an `order_confirm_reminder` notification.
   - Create and emit a real-time notification (`reference_prefix: 'order_confirm_reminder'`, pointing to `/gigs/orders/sent/:orderId`) reminding the client that less than 2 hours remain to confirm & fund escrow before the order expires.
   - Add a 5-minute cron schedule (`reconcileAcceptedGigOrdersService`) in `backend/lib/BackgroundJob.js` so `< 2h` reminders and `24h` expirations fire proactively in real time via WebSocket (`notification` + `gigOrderUpdated`).
2. **Client Platform Merit Policy Flow (Without Active Deduction Yet) (`sent_order_detail.tsx`, `GigRepositories.js`)**:
   - Update the 24-hour confirmation banner, decline confirmation modal, and `< 2h` reminder message so the client is clearly informed that failing to confirm/fund an accepted order (or declining after acceptance) may result in a Platform Merit deduction, while keeping actual warning point / merit deduction disabled for now as requested.

## Acceptance Criteria
- [x] Accepted orders with `< 2 hours` left on the 24-hour confirmation clock send a one-time `order_confirm_reminder` notification (in DB and real-time fuse toast via WebSocket).
- [x] Background cron job in `backend/lib/BackgroundJob.js` runs every 5 minutes to dispatch `< 2h` reminders and `24h` auto-expirations.
- [x] Client UI and reminder copy reflect the Platform Merit policy flow without deducting Merit points yet.
- [x] `cd frontend && npm run build` passes with zero errors.
