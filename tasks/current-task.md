# Active Task: Remove dead admin settings + enforce Maintenance mode

## Implementation Objective

1. Remove unused/dead System Settings fields and fee rows that are not enforced.
2. Make Platform → Maintenance mode actually block the member product (login and logged-in app routes) with a branded Ensemble maintenance page, while keeping the public landing pages and admin/staff consoles usable.

## Acceptance Criteria

- [ ] Removed from admin UI + defaults/config schema where appropriate: tagline, maxUploadMb, emailWeeklyDigest, notifyRequesterOnResolution, forceHttps, escrowHoldDays, and unused fee rows (credit purchase/refund, cancellation, dispute, forum, job-post, gig-create, asset-upload).
- [ ] Maintenance mode: member login + authenticated app routes show a branded maintenance page / are blocked.
- [ ] Landing pages on ensemble.software still work during maintenance.
- [ ] admin.ensemble.software and staff.ensemble.software remain fully usable during maintenance.
- [ ] `cd frontend && npm run build` passes.
