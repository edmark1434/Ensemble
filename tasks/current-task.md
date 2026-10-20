# Current Task: Refine Platform Walkthrough (Sidebar Activity Tabs, Jobs/Gigs Deep-Dive, Header Credits/Search & Welcome Flow)

## Objective
Implement user-requested walkthrough refinements:
1. **Welcome Modal Personalization & Skip Option**:
   - Welcome modal greets the user with their name: "Welcome to Ensemble, {displayName}!".
   - Clear skip button: "Skip (I know Ensemble)" for users who know the platform.
2. **Jobs & Gigs Marketplace Deep-Dive**:
   - Jobs: Post a Job button (`jobs-create-button`), Search Bar (`jobs-search-bar`), Tabs (`jobs-tabs`), Job Listing Card (`job-card-first`) showing View Full & Send Proposal options, and Proposals tab (`sidenav-jobs-proposals`).
   - Gigs: Post a Service button (`gigs-create-button`), Search Bar (`gigs-search-bar`), Tabs (`gigs-tabs`), Gig Card (`gig-card-first`) showing View Full & Order Package options, and Orders tab (`sidenav-gigs-orders`).
3. **Sidebar-Only Highlighting for Activity Tabs (No Verification Wall)**:
   - Deliveries (`sidenav-deliveries`), My Terms (`sidenav-tos`), and My Contracts (`sidenav-contracts`) are highlighted directly on the sidebar buttons with explanations.
   - The browser does not navigate inside `/dashboard`, `/terms-of-services`, or `/contracts`, completely preventing the "Verify First to View" modal.
4. **Ledger & Inbox**:
   - Transaction History (`transactions-table`).
   - Inbox messages (`inbox-container`).
5. **Top Header Controls & Support Flow**:
   - Credit Balance (`credits-pill`) explaining how to top up credits and fund projects.
   - Creator Search (`header-search-creators` / Alt+K) for finding people across the platform.
   - Sidebar Collapse (`sidenav-collapse`) explaining workspace maximization.
   - Profile Menu Help & Feedback (`profile-menu-feedback` & `profile-menu-support`).

## Acceptance Criteria
- [x] Welcome modal updated with user display name and explicit skip button.
- [x] Activity tabs (Deliveries, My Terms, My Contracts) point to sidebar links without navigating inside (preventing verification wall).
- [x] Jobs flow includes search, create button, tabs, job card, and proposals tab.
- [x] Gigs flow includes search, create button, tabs, gig card, and orders tab.
- [x] Header credits and Alt+K creator search included.
- [x] Sidebar collapse button and profile feedback/help links highlighted.
- [x] `npm run build --prefix frontend` succeeds with 0 errors.
