# Current Task: Fix Creator Profile Picture Not Showing on Discovery

## Objective
Fix avatar resolution in the Discovery section for General Gallery items (both card overlay in feed and expanded lightbox modal). Currently, preset avatars and missing avatars result in broken image icons because the code directly prepended CloudFront or pointed to non-existent `/default-avatar.png` without using `constructAvatarUrl()` and without an `onError` fallback to UI initial avatars.

## Acceptance Criteria
- [x] In `DiscoveryPage.tsx`, update gallery item card overlay avatar to use `constructAvatarUrl(item.avatar_url, item.handle || item.title)` and add `onError` fallback to `getFallbackAvatarUrl(item.handle || item.title)`.
- [x] In `DiscoveryPage.tsx`, update gallery modal avatar to use `constructAvatarUrl` and `getFallbackAvatarUrl`.
- [x] Ensure styling keeps avatar rounded, cleanly bordered, and shrink-0.
- [x] Run `npm --prefix frontend run build` to verify 0 build/type errors.
