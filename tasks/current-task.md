# Task: Asset Library Trash Adjustments & Seller Dashboard

## Implementation Objective
1. Remove "Delete permanently" functionality from the Trash tab and Asset Details view so soft-deleted assets can only be restored, preserving data integrity for any buyers or projects using them.
2. Add a comprehensive Seller Dashboard within the Asset Library (`/assets/seller`) tracking:
   - Total net revenue earned in credits
   - Total sales count across all assets
   - Overall unique buyers count
   - Active marketplace listings count
   - Per-asset sales, buyers, and revenue performance breakdown
   - Recent sales transaction history

## Acceptance Criteria
- Trash Tab:
  - `AssetCard.tsx`: When `view === "trash"`, only display the "Restore" button; remove the "Delete permanently" button.
  - `AssetDetails.tsx`: When `asset.trashed_at` is true, only display the "Restore" button; remove "Delete permanently".
  - `AssetsLibrary.tsx`: Remove permanent deletion prompt in Trash view.
- Seller Dashboard Backend:
  - Add repository function `getSellerAssetMetricsRepository(accountId)` in `backend/repositories/AssetRepositories.js` calculating total revenue, total sales, unique buyers count, per-asset breakdown, and recent sales.
  - Add service `getSellerAssetMetricsServices(accountId)` in `backend/services/AssetServices.js`.
  - Add controller `getSellerAssetMetricsController(req, res)` in `backend/controllers/AssetControllers.js`.
  - Mount route `GET /api/assets/seller/metrics` in `backend/routes/Asset.js` (protected with `[checkSession, requireAuth]`).
- Seller Dashboard Frontend:
  - Add `/assets/seller` route in `frontend/src/App.tsx`.
  - Add `"seller"` view to `AssetView` in `frontend/src/pages/user/5_assets/AssetsLibrary.tsx`.
  - Create `frontend/src/pages/user/5_assets/AssetSellerDashboard.tsx` with summary cards, per-asset breakdown table, and recent sales feed using standard theme (no gradients).
- User Preference:
  - Do not run builds, type checks, or lint.
