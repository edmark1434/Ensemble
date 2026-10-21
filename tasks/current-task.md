# Current Task: Remove Banner Dimming Overlay in Discovery Cards

## Objective
1. Fix client profile pictures and avatar fallbacks across all Job Market views (Grid view, List view, Job Details Drawer, Full Job Page, and Other Posts sidebar).
2. Add the Expand / View Full Page button (`Maximize2`) to the top right of the Gig Details drawer banner.
3. Update the category tabs in "Update Profile Banner" modal (`BannerEditModal.tsx`):
   - Monochrome / neutral icons (gray or black, no blue/colored tints).
   - Inactive tabs show only icons; active tab expands with label and count badge.
4. Refine the live previews in the modal:
   - Match the Freelancer role badge to the official profile gray styling (`border bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20` with `<Laptop className="w-2.5 h-2.5" />`).
   - Remove the "New" indicator from the preview switcher row.
5. Remove the dimming overlay (`bg-black/20 dark:bg-black/35`) from Discovery cards (`DiscoveryPage.tsx` and `BannerEditModal.tsx`) so banners render at full 100% natural brightness and vibrancy.

## Acceptance Criteria
- [x] Preset avatar file paths (`p1.png` - `p12.png`) resolve correctly to `/profile_presets/...` using `resolveAvatarPath()`.
- [x] Missing or failed client avatars fallback to an initial-letter circular badge on Job Market views.
- [x] Gig Details drawer (`GigViewDetails.tsx`) has the top-right View Full Page button (`Maximize2`).
- [x] Category tab icons are strictly neutral gray / black with no blue/colored tints.
- [x] "New" tag removed from preview header.
- [x] Role tag in Profile & Card previews matches the gray profile header tag styling.
- [x] Removed `bg-black/20 dark:bg-black/35` overlay from `DiscoveryPage.tsx` and `BannerEditModal.tsx` banner strips.
- [x] Frontend builds cleanly with 0 TypeScript/JSX errors.
