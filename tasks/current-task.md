# Current Task: Standardize 4-Tier Avatar Resolution & Gray Fallback Avatars

## Objective
Standardize the 4-tier avatar resolution logic (External HTTP/HTTPS URL, Preset Asset, CloudFront/S3 Upload, and Gray Fallback) across the Profile page, Discovery page, and Discovery Flip Card Modal. Ensure fallbacks use a neutral gray palette (`background=71717a&color=fff` / `#71717a`) instead of blue, preventing missing or broken avatar alt-text issues.

## Implementation Steps & Acceptance Criteria
1. **Avatar Resolution Utility (`frontend/src/lib/accountAvatars.ts`)**:
   - Provide standard 4-tier avatar resolution:
     1. Direct HTTP/HTTPS URLs (`/^https?:\/\//i`).
     2. Preset avatar filenames (`/profile_presets/p{N}.png`).
     3. Custom uploaded CloudFront / S3 paths (`${cloudfrontUrl}/${cleanPath}`).
     4. Neutral gray fallback avatar URL (`https://ui-avatars.com/api/?name=${cleanName}&background=71717a&color=fff`).
2. **Discovery Flip Card Modal (`frontend/src/components/ui/DiscoveryFlipCardModal.tsx`)**:
   - Resolve `user.avatar` using the 4-tier logic and ensure empty or missing avatars fall back to the gray `ui-avatars.com` image.
   - Add `onError` handler on the card avatar image element so that failed image loads seamlessly recover to the gray fallback instead of displaying broken `alt="Avatar"` text.
3. **Profile Page Top Section (`frontend/src/pages/user/7_profile/Displays/TopSection_ProfileDisplay.tsx`)**:
   - When no custom/preset avatar exists, display the gray fallback avatar (initials matching Discovery) with `onError` protection.
4. **Profile Page Logic (`frontend/src/pages/user/7_profile/Profile.tsx`)**:
   - Pass properly resolved avatar (with fallback) to `DiscoveryFlipCardModal`.
   - Ensure onboarding setup widget checklist only marks "Upload an Avatar" as complete when a genuine custom/preset avatar is set (not a default/ui-avatars fallback).
5. **Discovery Page (`frontend/src/pages/user/14_discovery/DiscoveryPage.tsx`)**:
   - Update fallback avatar generation to use neutral gray `background=71717a` instead of blue (`6366f1`).
6. **Verification**:
   - Run `cd frontend && npm run build` to verify clean TypeScript compilation.
