# Active Task: Platform Merit Engine

## Implementation Objective

New users start at merit 50 (Established). The score recomputes from real work, reviews, verification, age, and punishment hits. Crossing a band throttles products automatically. Low merit never auto-suspends, times out, or bans.

## Acceptance Criteria

- [x] Join score is 50 (Established). Missing score displays 50, not 100.
- [x] Bands: Trusted 75–100, Established 50–74, Watch 35–49, Restricted 20–34, Frozen 0–19.
- [x] Frozen / Restricted / Watch are automatic product limits, not standing punishments.
- [x] Recompute on close, review, verify, warn, timeout, suspend, ban, pardon, rescind.
- [x] Backend guards on jobs, gigs, proposals, assets, forums, new DMs, teams, cashout.
