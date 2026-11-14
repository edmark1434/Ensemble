# Active Task: Fix Live vs Local Subscription Plan Recognition in Asset Posting Limits

## Implementation Objective

Ensure `readAssetPostingEligibility` in `backend/repositories/AssetRepositories.js` identifies active user subscriptions consistently with `SubscriptionRepositories.js` (including `TRIALING` status, case-insensitive plan precedence, and fallback subscriptions). Provide clear operational instructions for the live server (backend restart, frontend build, database migrations).

## Acceptance Criteria

- [x] Align `readAssetPostingEligibility` subscription resolution with `SubscriptionRepositories.js`:
  - Support `s.status IS NULL OR UPPER(s.status) IN ('ACTIVE', 'TRIALING')`.
  - Order active subscriptions by plan priority (`Business` -> `Premium` -> others) and recency (`s.updated_at DESC, s.created_at DESC`).
  - Provide a fallback subscription query for expired/unconfirmed periods before falling back to `default_free_plan`.
- [x] Provide operational guidance for live deployment (service restart, static asset build, migration check).
