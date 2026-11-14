# Active Task: Enforce Subscription Asset Posting Limits & Live UI Feedback

## Implementation Objective

Ensure asset library upload and posting respects the user's subscription plan feature (`asset_posts`), properly counting published and in-review marketplace submissions so Free tier users cannot exceed their 1 asset post limit, while providing real-time UI display updates (`{used} / {limit} Uploaded`) and a dedicated upgrade modal when the limit is reached instead of a toast warning.

## Acceptance Criteria

- [x] `readAssetPostingEligibility` includes both `published` assets and in-review submissions (`status = 'draft'` with `marketplace_listings.status = 'pending'`).
- [x] `readAssetPostingEligibility` includes a fallback to the default Free plan when no active subscription record exists in `subscriptions`.
- [x] `readAssetPostingEligibility` returns `plan_name` for clear user context.
- [x] Soft-deleted and rejected assets do not count against the user's asset post quota.
- [x] Editing an existing asset excludes the current asset from the limit check (`excludeAssetId`).
- [x] Display `{number}/max_number` immediately and automatically increments upon uploading, and syncs on upload completion/deletion/socket events.
- [x] Small Upgrade Limit modal (`AssetLimitModal`) created and displayed instead of toast warning when the limit is reached, with a direct button to upgrade subscription.
- [ ] User verification (`pnpm typecheck`).
