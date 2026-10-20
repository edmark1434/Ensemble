# Current Task: Platform Walkthrough Flow & UX Redesign (Card Positioning, Detail Exit & Credits/Home Enhancements)

## Objective
Implement platform walkthrough enhancements requested by user:
1. **Card Positioning & Taskbar Clearance**:
   - Dynamic measurement of actual card height (`cardRef.current?.offsetHeight`).
   - Increased safe bottom padding to 52px so cards never clip behind the Windows taskbar or browser chrome.
   - Large container detection (`isLargeContainer`) for full-page workspaces (e.g. `projects-workspace`, discovery feed) to float cards comfortably centered inside without edge clipping or off-target arrows.
2. **Details Drawer Exit Steps**:
   - Added clickable exit steps (`jobs_detail_exit` and `gigs_detail_exit`) pointing to `[data-tour="job-detail-exit-pill"]` and `[data-tour="gig-detail-exit-pill"]` ("Click anywhere outside to close"), naturally closing the drawer before transitioning to Proposals and Orders.
3. **Billing & Subscription Plans Flow**:
   - Connected `header_credits` click to `/credits`.
   - Added steps for Current Balance card (`credits-balance-card`), Top up Credits packs (`credits-tab-topup`), and Subscription Plans tab (`credits-tab-membership`).
   - Highlights tiered membership plans grid (`credits-plans-grid`) displaying Free, Premium, and Business tiers.
4. **Home Page Featured Content Steps**:
   - Highlighted Latest Job Posts (`home-featured-jobs`).
   - Highlighted Top Services (`home-featured-gigs`).
   - Highlighted Popular Assets (`home-featured-assets`).

## Acceptance Criteria
- [x] Card positioning algorithm updated with 52px safe bottom margin and container detection.
- [x] Job & Gig detail exit steps added with backdrop pill targeting.
- [x] Billing & Subscription plans added to walkthrough flow.
- [x] Home featured sections (Latest Jobs, Top Services, Popular Assets) added to Section 1.
- [x] `npm run build --prefix frontend` succeeds with 0 errors.
