# Active Task: Remove dead admin settings + enforce Maintenance mode

## Implementation Objective

1. Remove unused/dead System Settings fields and fee rows that are not enforced.
2. Make Platform → Maintenance mode actually block the member product (login and logged-in app routes) with a branded Ensemble maintenance page, while keeping the public landing pages and admin/staff consoles usable.

## Acceptance Criteria

- [x] Removed dead settings: tagline, maxUploadMb, emailWeeklyDigest, notifyRequesterOnResolution, forceHttps, escrowHoldDays, and unused fee rows.
- [x] Maintenance mode blocks member login/signup and product app routes with branded maintenance UI.
- [x] Landing pages on the main site remain available during maintenance.
- [x] admin/staff consoles remain usable during maintenance.
- [x] `cd frontend && npm run build` passes.
