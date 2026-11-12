# Current Task: Fix Sidebar Overlap Tendency & Convert Job/Gig Cards to 1-Col View on Narrow/Split Screens

## Implementation Objective
1. **1-Column Vertical Card View for Jobs & Gigs (`media_1794526961786_92afd07c.png`)**:
   - On narrow split-screen and medium viewports (< 1280px / `xl`), convert Job Post and Service/Gig cards to a 1-column layout (`flex-col`):
     - Thumbnail sits on top (`w-full h-44 border-b`)
     - Details, tags, price, and actions stack naturally underneath with full width, preventing squished text and ellipsis.
   - On wide desktop screens (>= 1280px / `xl`), cards switch back to horizontal `xl:flex-row` with the thumbnail on the left (`xl:w-56`).
2. **Fix Sidebar Overlap Tendency**:
   - Prevent window-level horizontal overflow that causes content to slide underneath the fixed sidebar when snapped or resized.
   - Added `overflow-x-clip` and `min-w-0` to the layout container, `<main>`, and the profile grid (`xl:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] min-w-0`).
3. **2-Row Profile Navigation Display Threshold**:
   - Container threshold calibrated to `640px` (`el.clientWidth < 640`).
   - On wide viewports, displays full tab labels with icons and live counters.
   - On narrow viewports (< 640px), collapses to clean icons + badges with hover tooltips.

## Modified Files
- `frontend/src/pages/user/7_profile/Displays/Body/Profile_JobPosts.tsx`
- `frontend/src/pages/user/7_profile/Displays/Body/Profile_Services.tsx`
- `frontend/src/pages/user/7_profile/Displays/Body/MainBody.tsx`
- `frontend/src/pages/user/7_profile/Profile.tsx`
- `frontend/src/components/ui/Layout.tsx`
- `frontend/src/pages/user/7_profile/Displays/TopSection_ProfileDisplay.tsx`
- `tasks/current-task.md`
