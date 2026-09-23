# Current Task — Asset Moderation Approval & Publishing Pipeline

Fix the asset moderation and publishing pipeline so that:
1. When assets are created or set to publish, they are held in draft while awaiting moderator approval.
2. Editing a draft asset updates the existing review listing without creating duplicate records.
3. Moderator approval in the moderator portal automatically publishes the asset in `market_assets`.

## Acceptance Criteria
- [x] Database: Add migration `170` to add `market_asset_id` to `marketplace_listings` with foreign key and index.
- [x] Backend: Update `ModerationPolicy.js` to deduplicate and update existing `marketplace_listings` rows for the same `market_asset_id`.
- [x] Backend: Update `AssetServices.js` (`createAssetServices`, `updateAssetServices`) to link `market_asset_id` and maintain published status for already-approved assets.
- [x] Backend: Update `MarketplaceModeratorRepositories.js` (`reviewMarketplaceListing`) to update `market_assets.status = 'published'` on approval, and `'draft'` on rejection/delist.
- [x] Backend: Update `AdminModerationRepositories.js` (`updatePendingCase`, `deletePendingCase`) to update `market_assets.status = 'published'` on approval and `'draft'` on reject/delist/delete.
- [x] Frontend: In `AssetEditorModal.tsx`, display toast notification when an asset is queued for moderator review.
- [x] Verification: Test creation, editing without duplicates, and moderator approval end-to-end.

