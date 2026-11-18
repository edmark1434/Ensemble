# Task: Admin Marketplace Asset Upload & Platform Revenue

## Implementation Objective
Enable administrators to upload marketplace assets directly from the Admin Console (`Moderation` -> `Management` -> `Marketplace`) using the same upload modal used across the user platform. When users purchase an asset uploaded by an admin, no marketplace fee deduction will be applied, and 100% of the purchased credits will go straight into the platform's credits wallet ("platform credits money").

## Status: Completed

All acceptance criteria satisfied:
1. **Admin Console UI Integration**:
   - Added **"Upload asset"** button in `MarketplaceManagementSection` / `MarketplaceControl` (`/admin/moderation?tab=management&section=marketplace`) following the Admin Console dark theme.
   - Opens the same `AssetEditorModal` used by the user platform, forced into dark theme when rendered in the Admin Console.
2. **Admin Asset Creation Flow**:
   - Added `POST /api/admin/moderation/marketplace/assets` (`createAdminAssetController` -> `createAssetServices` -> `createAssetRepository`).
   - Added migration `1829100000000_admin-market-assets.js` (`market_assets.is_admin_asset` + nullable `media_assets.owner_user_id`).
   - Admin uploads bypass member posting limits, subscriptions, verification gates, and listing fees, and publish directly into the live catalog (`status = 'published'`, listing `status = 'approved'`).
3. **Purchasing & Zero-Deduction Revenue Routing**:
   - In `purchaseAssetRepository` and `publicAsset`, admin assets (`is_admin_asset` or staff-submitted) have `0%` fee deduction (`transactionFeeCredits = 0`).
   - 100% of the purchased credits transfer directly from the buyer's wallet into the platform wallet (`wallets.type = 'platform wallets'`).
4. **Verification**:
   - User verification preference respected (no build/typecheck commands run).
