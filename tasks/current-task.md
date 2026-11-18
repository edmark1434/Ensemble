# Task: Admin Asset Creator Attribution (By Ensemble & Logo Profile)

## Implementation Objective
For assets uploaded by admin/staff (`is_admin_asset = true`):
1. Display name shown in the user platform should be `"By Ensemble"` instead of `"Admin User"` (or staff account name).
2. Creator profile picture/avatar should display the Ensemble logo (`/ensemble_lg.svg`) with appropriate theme inversion (`invert dark:invert-0`) so it renders clearly in both light and dark modes.
3. Creator handle for admin assets is represented as `@ensemble`.
4. Hide or omit personal user profile navigation for platform/admin assets where appropriate.
5. Prevent redundant prefixes like `"by By Ensemble"` in purchase dialogs.

## Acceptance Criteria
- `backend/repositories/AssetRepositories.js`: `ASSET_SELECT` returns `By Ensemble` as `creator_name`, `ensemble` as `creator_handle`, and `/ensemble_lg.svg` as `creator_avatar_path` for admin/staff assets.
- `backend/services/AssetServices.js`: `publicAsset` ensures `creator_name: 'By Ensemble'`, `creator_handle: 'ensemble'`, and `creator_avatar_path: '/ensemble_lg.svg'` on all admin asset responses.
- `frontend/src/pages/user/5_assets/assetTypes.ts`: `mediaUrl` preserves local assets like `/ensemble_lg.svg` without prefixing CloudFront CDN URL.
- `frontend/src/pages/user/5_assets/AssetCard.tsx`: Displays the Ensemble logo profile avatar and `"By Ensemble"` display name.
- `frontend/src/pages/user/5_assets/AssetDetails.tsx`: Displays the Ensemble logo profile avatar, `"By Ensemble"`, Official platform badge, and omits the user profile navigation button for admin assets.
- `frontend/src/pages/user/5_assets/AssetPurchaseModal.tsx`: Formats `"By Ensemble"` cleanly without repeating the `"by"` prefix.
- User preference: do not run automated build or verification commands.
