# Current Task — Asset Moderation Status, Notifications & Rejection Lifecycle

Fix the user POV for approved/rejected assets, implement notifications for listing review decisions, and handle rejected asset feedback and resubmission.

## Acceptance Criteria
- [x] Backend: Add `sendMarketplaceListingNotification` in `ModerationPolicy.js` to create in-app notifications and emit WebSocket updates (`notification`, `assetStatusUpdated`) upon listing approval, rejection, and delisting.
- [x] Backend: Call `sendMarketplaceListingNotification` in `MarketplaceModeratorRepositories.js` (`reviewMarketplaceListing`) and `AdminModerationRepositories.js` (`updatePendingCase`, `deletePendingCase`).
- [x] Backend: In `AssetRepositories.js`, query `review_status` and `rejection_reason` via lateral join to `marketplace_listings` in `ASSET_SELECT`.
- [x] Backend: In `AssetRepositories.js`, clean up `marketplace_listings` on asset deletion (`deleteAssetRepository`).
- [x] Backend: In `AssetServices.js`, forward `review_status` and `rejection_reason` to asset owners in `publicAsset`, and allow `'all'`, `'published'`, `'pending'`, `'rejected'`, `'draft'` in `listAssetsServices` for owner view.
- [x] Frontend: In `assetTypes.ts`, add `review_status` and `rejection_reason` to `AssetRecord` and update `MineStatus`.
- [x] Frontend: In `AssetCard.tsx` and `AssetDetails.tsx`, display distinct status badges (**Published**, **Under Review**, **Rejected**, **Draft**) and show moderator rejection reason callout with edit-to-resubmit action.
- [x] Frontend: In `AssetsLibrary.tsx`, update subtabs (All, Published, Under Review, Rejected, Drafts) and add WebSocket listener for `assetStatusUpdated` and `notification` for realtime updates.
- [x] Verification: Test end-to-end approval, rejection, notifications, and frontend build.


