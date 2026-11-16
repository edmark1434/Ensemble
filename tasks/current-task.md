# Active Task: Stop shared-network 429s and add admin rate-limit monitoring

## Implementation Objective

Several people using the platform at once get `429 Too many requests`. The API limiter counted every request per IP, so members sharing one public IP (alpha testers on the same Wi-Fi) shared one budget. Polling pages also exhausted the 600-per-15-minute `general` budget alone (team project workspace: 7 GETs every 8 s ≈ 790 per 15 min). Fix the limiter and give admins a monitor for traffic, 429s and IP pass-through.

## Acceptance Criteria

- People sharing an IP (same Wi-Fi) do not affect each other: signed-in requests count only per account (session must exist in Redis), with no IP limit; signed-out requests count per browser (signed `ens_rl` cookie) plus a high per-IP network ceiling meant only as an abuse backstop. Login/signup counts per browser plus network.
- Everyday read/write policies use one-minute windows with budgets that fit legitimate polling.
- Chat and ticket route limiters use the same Redis store and monitor instead of in-memory `express-rate-limit`.
- `TRUST_PROXY` accepts a numeric hop count; existing address-list values behave as before.
- Admin Analytics → Traffic & rate limits shows requests/429s per minute, policy limits, busiest windows (with reset), shared IPs, recent 429s, store errors, and an IP pass-through check for the admin's own request.
- Docs updated (security, api, frontend, caching). No builds, type checks or lint run (user verifies with `pnpm typecheck`).

## Implementation Status

- Done. Backend: `middleware/RateLimiter.js`, `lib/RateLimitMonitor.js`, `services/RateLimitMonitorServices.js`, `controllers/AdminRateLimitControllers.js`, `routes/Admin.js`, `routes/Chat.js`, `routes/Ticket.js`, `Server.js`.
- Frontend: `pages/admin/analytics/components/RateLimitMonitorPanel.tsx`, `pages/admin/analytics/AnalyticsPage.tsx`.
- Previous task (alpha testing survey) is complete: `reports/Ensemble alpha testing survey.md`, `reports/Ensemble SUS and acceptance testing questionnaire.md`.
