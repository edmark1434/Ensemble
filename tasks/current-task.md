# Active Task: Refactor Asset Upload Modal & Make Success Modals Dark Zinc

## Implementation Objective

1. Fix the Walkthrough Welcome Modal so it immediately closes when "START WALKTHROUGH" is clicked.
2. Refactor the Asset Upload Modal to adopt Ensemble's zinc dark theme, improve layout, fix the untouchable "0", divide into a 2-column layout (Left: Asset Type `*`, Asset Files `*`; Right: Title `*` with `0/50`, Price `*`, Description `*` with `0/5000`, Tags `*` with min 3 tags).
3. Transform all Success Modals across the application (Job Post Create & Edit, Gig Create & Edit, Asset Upload & Edit, Teams, Proposals, Orders) from bluish navy to dark zinc:
   - Card container: `dark:bg-[#121214]` / `dark:border-zinc-800`.
   - Remove cyan & purple glow blobs that caused a bluish reflection; replace with subtle neutral emerald glow.
   - Text & badge: `text-zinc-950` on emerald actions, `dark:text-zinc-100` title.
   - Support success celebration modal on Asset Edit in both library and details views.
4. Render the Asset Media Preview card on the Left Side when editing any existing asset (including single assets) so the left column displays the media image/player, resolution, file name, and file size instead of being empty.

## Acceptance Criteria

- [x] `TourWelcomeModal.tsx` gates modal rendering on `isOpen` inside `AnimatePresence` and dismisses on start walkthrough.
- [x] `AssetEditorModal.tsx` uses zinc dark mode palette (`#121214`, `bg-zinc-900`, `bg-zinc-950`, `border-zinc-800`).
- [x] Credit price input in `AssetEditorModal.tsx` allows backspacing the "0", auto-selects on focus, and defaults to "0" on blur if empty.
- [x] Modal divided into Left (Asset Type `*`, Asset Files `*`, showcase controls) and Right (Title `*` with `0/50` counter, Price in credits `*`, Description `*` with `0/5000` counter, Tags `*` with minimum 3 tags enforcement).
- [x] `SuccessModal.tsx` converted to dark zinc (`dark:bg-[#121214]`, `dark:border-zinc-800`), eliminating the navy blue (`#0d0f1a`) and cyan/purple glow reflections.
- [x] Job Post Success (Create & Edit), Gig Post Success (Create & Edit), and Asset (Upload & Edit) all render in dark zinc theme.
- [x] In `AssetEditorModal.tsx`, editing an asset with a single file (or multi-file) displays the media preview card with thumbnail/player and metadata inside the left column.
- [x] Added an informative locked-asset notice card with a lock icon in `AssetEditorModal.tsx` clarifying that the primary media file is immutable to protect buyers and licensing, while listing details remain editable.
- [x] Added `UPDATED AT` metadata card with `CalendarClock` icon, date, and timestamp (`formatDate(asset.updated_at, true)`) right after `PUBLISHED` on [`AssetDetails.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/5_assets/AssetDetails.tsx).
- [x] Fixed audio bundle thumbnail duplication in `AssetDetails.tsx`: individual sounds in "Package contents" no longer inherit the bundle's cover image (`asset.thumbnail_path`). Sounds without their own specific thumbnail render a dedicated audio card with `AudioLines` and sound title.
- [x] Sticky footer implemented for `AssetEditorModal.tsx`: the Cancel and Upload/Save buttons remain pinned at the bottom of the modal while the form content scrolls smoothly.
