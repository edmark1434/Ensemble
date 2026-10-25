# Active Task: Application Windows, Auto-Expiration, Credit Refunds, & Profile Features

## Implementation Objective
1. **Phase 1: Database & Backend Engine (COMPLETED)**
   - [x] Database migration `1792922614562_add-application-windows-and-refund-rules.js` executed.
   - [x] `jobs` schema updated with `application_deadline`, `is_urgent`, `hard_deadline`, `posting_fee_credits`, `application_extended_at`, `free_extension_count`.
   - [x] `proposals` schema updated with `submission_fee_credits`.
   - [x] `credit_transactions` type check constraint expanded to include `'Job Posting Fee Refund'`.
   - [x] Repository methods implemented for auto-expiration, free extensions, and conditional refunds (100% 50c to client if 0 proposals; 100% to applicants if expired without hire).
   - [x] Background cron worker scheduled in `BackgroundJob.js` every 10 minutes.
   - [x] Backend routes and controllers added for `/api/jobs/:jobId/extend-window` and `/api/jobs/:jobId/expire-now`.

2. **Phase 2: UI Integration (COMPLETED)**
   - [x] Added Application Window selector presets (`⚡ 12h`, `⚡ 24h`, `3d`, `7d`, `14d`) with **default set to 3 Days (72h)**.
   - [x] Set default Timeline Turnaround to **Standard (3–5 Days)** across post and team creation.
   - [x] Overhauled **Required Skills** in [`SkillsAutocomplete.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_components/job_creation_components/SkillsAutocomplete.tsx).
   - [x] Redesigned Review & Post Section 03 in [`3_create_review.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_components/job_creation_components/3_create_review.tsx).
   - [x] Streamlined **Application Window Status** into single-row gray container with yellow accent line, live Plus Jakarta countdown, and force-close refund confirmation modal.

3. **Phase 3: Status Standardization (Open & Closed) & Info Guides (COMPLETED)**
   - [x] Standardized all job status badges to **Open** and **Closed** only (eliminated the `Expired` tag).
   - [x] In [`proposals_select_job_page.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_proposals/proposals_pages/proposals_select_job_page.tsx), normalized statuses to strictly render `Open` (green) or `Closed` (red/rose).
   - [x] Updated backend repositories to set `status = 'Closed'` on immediate and automatic expiration, and converted existing DB records to `'Closed'`.
   - [x] Revamped `/jobs/proposals/flow` ([`JobProposalsFlowGuide.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_proposals/proposals_components/JobProposalsFlowGuide.tsx)).
   - [x] Enhanced `/jobs/info` ([`JobPostsInfoGuide.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_components/JobPostsInfoGuide.tsx)).

4. **Phase 4: Circular Progress Indicators & Profile Merit Score (COMPLETED)**
   - [x] Removed icon beside "Activity on this Job" and simplified "Interviewing / Shortlisted" to "Shortlisted".
   - [x] Added circular progress rings to Job Discovery Score across [`job_full_page.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_pages/job_full_page.tsx) and [`job_viewdetails.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_components/job_viewdetails.tsx).
   - [x] Overhauled **Performance Merit Score** in [`MeritSection_ProfileDisplay.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/7_profile/Displays/MeritSection_ProfileDisplay.tsx) with dynamic color scaling (100% = emerald green, 50% = yellow-orange, 0% = red).

5. **Phase 5: Owner Dispute History & Side Nav Cleanup (COMPLETED)**
   - [x] Added owner-only **Dispute History** button beside Performance Merit Score in [`MeritSection_ProfileDisplay.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/7_profile/Displays/MeritSection_ProfileDisplay.tsx) navigating to `/contracts/disputes`.
   - [x] Removed **Disputes** item from the sidebar navigation in [`user_nav.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/components/nav/user_nav.tsx).

6. **Phase 6: Relocate Account Record from Profile Tabs to Merit Score Card (COMPLETED)**
   - [x] Added owner-only **Record** button directly on the Performance Merit Score card beside **Dispute History** in [`MeritSection_ProfileDisplay.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/7_profile/Displays/MeritSection_ProfileDisplay.tsx).
   - [x] Integrated "My Account Record" modal popup with backdrop blur and full standing, warnings, timeouts, and recent activity display.
   - [x] Removed the "Record" tab and panel completely from [`MainBody.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/7_profile/Displays/Body/MainBody.tsx).

7. **Phase 7: Card Streamlining & Uncluttering (COMPLETED)**
   - [x] Removed redundant headers ("Performance Merit Score", "Ecosystem Node Trust Index", and "Verified" badge) in favor of the clean, prominent **Platform Merit** card header.
   - [x] Formatted action buttons (`Record` & `Dispute History`) into a balanced 2-column bottom section.

8. **Phase 8: Generate Profile Introduction with Joed AI (COMPLETED)**
   - [x] Backend endpoint `POST /api/chat/generate-profile-introduction` implemented in `Chat.js`, `ChatControllers.js`, and `ClaudeSupportServices.js`.
   - [x] Prompt structure with custom tone options (`Casual`, `Direct`, `Professional`, `Narrative`) and first-person creative voice rules.
   - [x] Front-end **Generate with Joed AI!** button added to profile introduction in [`Profile_Introduction.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/7_profile/Displays/Body/Profile_Introduction.tsx) in both view mode header and editor toolbar.
   - [x] Integrated Joed AI modal with pre-fetched name, background explanation textarea, tone selector pills with hover tooltips, and 3-minute (180s) cooldown timer.
   - [x] Maintained strict rule: "don't commit unless i say so".
