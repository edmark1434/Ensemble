# Asset Marketplace

Routes: `/assets`, `/assets/:assetId`

Sources:

- `frontend/src/pages/user/5_assets/AssetsLibrary.tsx`
- `frontend/src/pages/user/5_assets/AssetDetails.tsx`
- `frontend/src/pages/user/5_assets/AssetEditorModal.tsx`

## Browse and manage assets

The Assets Library provides marketplace discovery and user-specific asset views. Asset Details displays listing information, creator information, tags, engagement, comments and replies, and purchase state.

## Create an asset

The asset editor accepts an original file and a listing thumbnail. It supports image, video, and audio previews where appropriate. Listing information includes the asset identity, description, pricing, and optional tags.

## Buy an asset

An authenticated non-owner can purchase a published paid asset or claim a zero-credit asset. The purchase confirmation shows the asset, total credits, current wallet balance, and projected balance. Insufficient balance prevents purchase.

After a successful purchase, the asset appears as owned and is available through the Purchased library view.

## Original file access

Creators and active purchasers can open the protected Original File section. The interface requests short-lived access only when the original-file modal is opened. Public listing responses do not expose the permanent storage path.

## Ownership and deletion

The creator remains the listing and media owner after purchase. A buyer receives access to the asset; ownership of the creator's listing is not transferred. Assets with active purchases cannot be deleted while no refund/removal workflow is available.

Dynamic route `/assets/:assetId` requires a real asset ID.
