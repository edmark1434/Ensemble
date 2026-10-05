# Current Task: Profile banner presets

## Objective
Let users pick a profile banner from fixed presets in `frontend/public/profile_banner_presets` (851 x 315). No custom uploads.

## Acceptance criteria
- `accounts.banner_preset` stores the chosen preset file name (nullable); added via a new migration with up/down.
- `PUT /api/accounts/profile/banner` accepts `{ banner_preset: string | null }` and rejects names outside the preset list.
- The profile query returns `banner_preset`.
- The profile header shows the banner at an 851:315 ratio, with the avatar overlapping its bottom edge.
- Owners get an "Edit banner" / "Add a profile banner" control that opens a preset picker modal styled like the avatar picker, with a "Remove banner" option.
- The preset list is kept in sync in `frontend/src/lib/profileBanners.ts` and `backend/lib/ProfileBannerPresets.js`.
