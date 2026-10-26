# Active Task: Milestone Switcher & Single-Milestone Focus View

## Implementation Objective
1. **Left Sidebar Milestone Switcher**:
   - Added a dedicated "Switch Milestone" navigation section on the left sidebar in `ProjectSubmissionsTab.tsx`.
   - Lists each milestone with its index badge (`M1`, `M2`), title, status indicator (`Approved`, `Awaiting Review`, `Revision Requested`, `In Progress`, `Upcoming`), escrow credits, and active highlight state.
   - Clicking any milestone immediately switches the active milestone view.
2. **Single-Milestone View (No More Milestones Pushed Under M1)**:
   - Instead of rendering all milestones in an infinitely tall stacked accordion where M2 is stuck hundreds of pixels below M1's submission form, the right side now displays the selected milestone in focus.
   - Added a top quick-switcher tab bar (`M1: The Process`, `M2: The Final Cut`) with previous/next chevrons across the top of the right panel.
   - Added bottom pagination buttons (`← Previous: M1`, `Next: M2 →`) for seamless navigation between milestones.
   - Clicking milestone header allows collapsing/expanding the details of the active milestone.
3. **Submission History Modal & Deliverable Preview**:
   - Submission history opens in a dedicated modal popup with milestone tabs and full interactive preview of images, videos, and PDFs.
   - Discussing deliverables in team chat prefills the milestone reference in the Channel Chat tab.

4. **Milestone Revision Deduction & Accounting Fix**:
   - Fixed SQL discrepancy in `TeamProjectRepositories.js` where revision query only counted `revision_requested` instead of both `revision_request` and `revision_requested`.
   - Added frontend fallback calculation in `ProjectSubmissionsTab.tsx` to automatically derive and count recorded revision requests from `m.submissions` if backend count is pending.
   - Revisions now correctly deduct from quota (e.g. `Revisions: 1 / 2 remaining`).
5. **One-Line Clickable Revision / Rejection Indicator & Scope Layout Refinement**:
   - Relocated "Milestone Scope & Requirements" to the left column as a clean card under the Review Station, updating dynamically whenever the active milestone changes.
   - Freed up vertical space on the right panel so the deliverable card opens directly into the one-line revision indicator and submission/review panel.
   - Removed the duplicate revision feedback box from inside the contributor submit form.
   - Clicking the one-line indicator continues to open the dedicated history modal popup.

6. **Paid Revision / Additional Work Rate Flow**:
   - Client is no longer blocked when included revisions reach 0 (`remainingRevisions <= 0`).
   - The button remains clickable as `Request Additional Revision (+{additionalRate} Credits)`.
   - In the review modal, the client is shown an "Additional Work Rate Applies" breakdown showing the exact agreed additional work rate credits (e.g. `+35 Credits`) that will be charged.
   - When submitting, the frontend calls `buyRevision` (`POST /api/dashboard/tasks/:contractId/milestones/:milestoneId/buy-revision`) with a unique idempotency key, holds the credits in escrow for the contributor, and immediately records the revision request note.
   - Backend repositories (`DashboardRepositories.js` and `TeamProjectRepositories.js`) updated to support both revision status variants and expose `revision_price_credits`.

## Verification
- Frontend: `npm --prefix frontend run build` (Clean build exited with code 0).
- Git worktree: No changes to `video-editor/`, no git commits made.

## Implementation Objective

1. **Phase 1: Database & Backend Engine (COMPLETED)**
    - [x] Database migration `1792922614562_add-application-windows-and-refund-rules.js` executed.
    - [x] `jobs` schema updated with `application_deadline`, `is_urgent`, `hard_deadline`, `posting_fee_credits`, `application_extended_at`, and `free_extension_count`.
    - [x] `proposals` schema updated with `submission_fee_credits`.
    - [x] `credit_transactions` type check constraint expanded to include `'Job Posting Fee Refund'`.
    - [x] Repository methods implemented for auto-expiration, free extensions, and conditional refunds (100% 50c to client if 0 proposals; 100% to applicants if expired without hire).
    - [x] Background cron worker scheduled in `BackgroundJob.js` every 10 minutes.
    - [x] Backend routes and controllers added for `/api/jobs/:jobId/extend-window` and `/api/jobs/:jobId/expire-now`.

2. **Phase 2: UI Integration (COMPLETED)**
    - [x] Added Application Window selector presets (`⚡ 12h`, `⚡ 24h`, `3d`, `7d`, `14d`) with default set to 3 Days (72h).
    - [x] Set default Timeline Turnaround to Standard (3–5 Days) across post and team creation.
    - [x] Overhauled Required Skills in `SkillsAutocomplete.tsx`.
    - [x] Redesigned Review & Post Section 03 in `3_create_review.tsx`.
    - [x] Streamlined Application Window Status into a single-row gray container with yellow accent line, live Plus Jakarta countdown, and force-close refund confirmation modal.

3. **Phase 3: Status Standardization (Open & Closed) & Info Guides (COMPLETED)**
    - [x] Standardized all job status badges to Open and Closed only (eliminated the `Expired` tag).
    - [x] In `proposals_select_job_page.tsx`, normalized statuses to strictly render Open (green) or Closed (red/rose).
    - [x] Updated backend repositories to set `status = 'Closed'` on immediate and automatic expiration, and converted existing DB records to `'Closed'`.
    - [x] Revamped `/jobs/proposals/flow` in `JobProposalsFlowGuide.tsx`.
    - [x] Enhanced `/jobs/info` in `JobPostsInfoGuide.tsx`.

4. **Phase 4: Circular Progress Indicators & Profile Merit Score (COMPLETED)**
    - [x] Removed the icon beside “Activity on this Job” and simplified “Interviewing / Shortlisted” to “Shortlisted”.
    - [x] Added circular progress rings to Job Discovery Score across `job_full_page.tsx` and `job_viewdetails.tsx`.
    - [x] Overhauled Performance Merit Score in `MeritSection_ProfileDisplay.tsx` with dynamic color scaling (100% = emerald green, 50% = yellow-orange, 0% = red).

5. **Phase 5: Owner Dispute History & Side Nav Cleanup (COMPLETED)**
    - [x] Added owner-only Dispute History button beside Performance Merit Score in `MeritSection_ProfileDisplay.tsx`, navigating to `/contracts/disputes`.
    - [x] Removed Disputes from the sidebar navigation in `user_nav.tsx`.

6. **Phase 6: Relocate Account Record from Profile Tabs to Merit Score Card (COMPLETED)**
    - [x] Added owner-only Record button directly on the Performance Merit Score card beside Dispute History in `MeritSection_ProfileDisplay.tsx`.
    - [x] Integrated the “My Account Record” modal with backdrop blur and standing, warnings, timeouts, and recent activity display.
    - [x] Removed the Record tab and panel from `MainBody.tsx`.

7. **Phase 7: Card Streamlining & Uncluttering (COMPLETED)**
    - [x] Removed redundant headers (“Performance Merit Score”, “Ecosystem Node Trust Index”, and “Verified” badge) in favor of the clean, prominent Platform Merit card header.
    - [x] Formatted the Record and Dispute History buttons into a balanced two-column bottom section.

8. **Phase 8: Generate Profile Introduction with Joed AI (COMPLETED)**
    - [x] Backend endpoint `POST /api/chat/generate-profile-introduction` implemented in `Chat.js`, `ChatControllers.js`, and `ClaudeSupportServices.js`.
    - [x] Added prompt structure with custom tone options (Casual, Direct, Professional, Narrative) and first-person creative voice rules.
    - [x] Added the Generate with Joed AI! button to the profile introduction in `Profile_Introduction.tsx`, in both view mode and the editor toolbar.
    - [x] Integrated the Joed AI modal with pre-fetched name, background explanation textarea, tone selector pills with hover tooltips, and a 3-minute cooldown timer.
    - [x] Maintained the rule: “don't commit unless i say so”.

9. **Phase 9: Marketplace Listing Fee SQL & Migration Review (COMPLETED)**
    - [x] Updated marketplace listing fee insertion in `AssetRepositories.js` to use the actual `credit_transactions` columns: `amount_credits`, `type`, `status`, wallet IDs, and reference fields. `created_at` uses its database default.
    - [x] Confirmed references to `media_asset_bundle_files` and `media_asset_thumbnails` in `1824500000000_restructure-market-assets.js` are used during data migration before those legacy tables are dropped.

## Previous Asset Creation Fix

- [x] Added migration `1824600000000_pending-media-derivatives` to permit pending derivative references and image processing jobs.
- [x] Saved image listings before preview generation and started the durable worker with the backend.
- [x] Displayed and refreshed processing states; publish only when previews are ready.
- [x] Verified creation in rollback-only transactions and ran focused worker checks. Browser checks stay with the user.

## Previous Completed Work

- [x] Site video uploads finalize a capped original before the uploaded file is usable.
- [x] Editor file and URL video uploads persist capped originals and return their actual URL and dimensions to the client.
- [x] Market video proxies only overlay the watermark on the finalized original and have identical dimensions.
- [x] Preserved aspect ratio and portrait orientation; use server-probed metadata and handle failures without publishing incomplete files.
- [x] No editor sizing changes, image-original resolution caps, or premium behavior.
- [x] Focused processing checks and editor type check; browser checking is left to the user.

4. **Milestone Revision Deduction & Accounting Fix**:
   - Fixed SQL discrepancy in `TeamProjectRepositories.js` where revision query only counted `revision_requested` instead of both `revision_request` and `revision_requested`.
   - Added frontend fallback calculation in `ProjectSubmissionsTab.tsx` to automatically derive and count recorded revision requests from `m.submissions` if backend count is pending.
   - Revisions now correctly deduct from quota (e.g. `Revisions: 1 / 2 remaining`).
5. **One-Line Clickable Revision / Rejection Indicator & Scope Layout Refinement**:
   - Relocated "Milestone Scope & Requirements" to the left column as a clean card under the Review Station, updating dynamically whenever the active milestone changes.
   - Freed up vertical space on the right panel so the deliverable card opens directly into the one-line revision indicator and submission/review panel.
   - Removed the duplicate revision feedback box from inside the contributor submit form.
   - Clicking the one-line indicator continues to open the dedicated history modal popup.

6. **Paid Revision / Additional Work Rate Flow**:
   - Client is no longer blocked when included revisions reach 0 (`remainingRevisions <= 0`).
   - The button remains clickable as `Request Additional Revision (+{additionalRate} Credits)`.
   - In the review modal, the client is shown an "Additional Work Rate Applies" breakdown showing the exact agreed additional work rate credits (e.g. `+35 Credits`) that will be charged.
   - When submitting, the frontend calls `buyRevision` (`POST /api/dashboard/tasks/:contractId/milestones/:milestoneId/buy-revision`) with a unique idempotency key, holds the credits in escrow for the contributor, and immediately records the revision request note.
   - Backend repositories (`DashboardRepositories.js` and `TeamProjectRepositories.js`) updated to support both revision status variants and expose `revision_price_credits`.

## Verification

- Checked the marketplace listing fee query against the migration-defined `credit_transactions` schema and updated it to use valid columns. No build or tests run for this SQL correction.
- The migration `1824600000000_pending-media-derivatives` was applied to the confirmed local development database. A rollback-only regression check reproduced SQL error 23502 under the old constraint, then created video, audio, and image listings, checked pending/failed/ready states and publication, and ran the image worker with in-memory storage. All test data was rolled back and no storage objects were created.
- Backend video/image processing: 11 tests passed, including audio retention, same-size proxies, rotation, non-square pixels, and a higher-resolution watermark-only input.
- Editor video normalization: 8 tests passed, including landscape/portrait/square/ultrawide, unchanged smaller sources, rotation, non-square pixels, and invalid input rejection.
- Editor `npm run typecheck`, changed backend JavaScript syntax checks, and focused `git diff --check` passed.
- No browser checks, full builds, live S3/database uploads, or existing-asset conversions performed. New-upload browser verification remains with the user.
- Editor runtime requires FFmpeg on PATH (available locally) or `FFMPEG_PATH`; documented in `docs/architecture.md`.

### Previous Asset Creation Findings

Video/audio creation inserted NULL proxy/thumbnail IDs while both columns were NOT NULL in the local database. The latest 433 KB image spent 150 seconds between upload finalization and listing creation. A read-only storage download did not finish within 25 seconds.
9. **Phase 9: WarmTooltip, Rich Introduction Editor & AI Quality Guardrails (COMPLETED)**
    - [x] Added WarmTooltip and WarmTooltipGroup component with spring physics and keyboard shortcuts chips.
    - [x] Streamlined introduction editor toolbar strictly to Bold, Italic, Underline, Bullet List, and Headings (H1-H4) dropdown with WarmTooltips.
    - [x] Supported <u> HTML rendering in ReactMarkdown using 
ehype-raw in both edit preview and view mode.
    - [x] Replaced the single preview toggle with a modern segmented pill control ([ Write | Preview ]).
    - [x] Added deterministic and AI quality guardrails for gibberish/random text detection.
    - [x] Disabled introduction saving when no edits have occurred.
    - [x] Enforced a minimum 3-word requirement for Joed AI background notes with live counter.

10. **Phase 10: Proposal Close Post Visibility & Wallet Response Normalization (COMPLETED)**
    - [x] In proposals_incoming_page.tsx, restricted Close Post button visibility strictly to open posts with 0 proposals.
    - [x] Connected the Close Post button to the Force Close & Expire modal with immediate intake window termination and 50 Credits refund.
    - [x] Normalized /api/accounts/wallet response in AccountControllers.js to provide both wallet and data properties, and updated 1_create_coreinfo.tsx to safely inspect both.


45. **Phase 45: Neutral Section Icons, Comprehensive Workspace Audit History & Header Milestone 1 Countdown (COMPLETED)**
    - [x] **Dark Neutral Section Header Icons**: In [`ContractDetailsPage.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/contracts/ContractDetailsPage.tsx), updated the icons on the left of Section I (`FileText`), Section II (`Clock`), and Section III (`Users`) from blue/indigo to neutral gray/dark gray (`text-zinc-500 dark:text-zinc-400`).
    - [x] **Team Workspace History Roster**:
      - In [`TeamProjectRepositories.js`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/backend/repositories/TeamProjectRepositories.js) (`getProjectHistory`), merged active `team_members` to ensure all members added to the project workspace are comprehensively represented in the audit trail.
      - Enriched existing `contract_offer_extended` events to display the contributor directly (`[CONTRIBUTOR ADDED]`) with their avatar, role, and who added them.
      - Synthesized a `workspace_created` entry for the Project Owner initializing the team workspace (`[WORKSPACE INITIALIZED]`).
      - In [`ProjectHistoryTab.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/3_teams/team_project/ProjectHistoryTab.tsx), added `workspace_created` and `contributor_added` action labels and rendered clear explanatory metadata messages (`Added to project team by ... • Role: ...`).
    - [x] **Milestone 1 Timeline & Countdown Pill**:
      - In [`TeamProjectWorkspace.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/3_teams/team_project/TeamProjectWorkspace.tsx), added a live 1-second ticking countdown timer for Milestone 1.
      - Positioned directly beside the `"Client (Project Owner)"` pill in the header metadata tags strip.
      - Displays Milestone 1 timeline dates (e.g. `Oct 26 – Oct 29`) and real-time live countdown (e.g. `2d 23h 14m 10s`), adhering to the existing visual theme without gradients.
    - [x] Preserved the rule: “don't commit unless i say so”.
    - [x] Verified full build with `npm --prefix frontend run build` passing cleanly with 0 errors.


46. **Phase 46: Team Workspace "Project" Tab & Video Projects Collaboration Access (COMPLETED)**
    - [x] **Database Migration**: Added migration `1825100000000_add-team-workspace-projects.js` which introduces `project_id` on `team_contract_workspaces` and `team_workspace_projects` junction table linking video projects directly to contracts, backfilling any `existing_project_id` from associated jobs.
    - [x] **Workspace Member Access Sync**: Implemented `ensureWorkspaceMembersHaveProjectAccess` in [`TeamProjectRepositories.js`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/backend/repositories/TeamProjectRepositories.js) so that all active workspace members automatically receive real-time `Editor` permission in `project_members`.
    - [x] **Backend API Routes & Services**:
      - `GET /api/team-projects/:id/video-projects` — returns all linked video projects with dimensions, duration, status, and collaborator list.
      - `GET /api/team-projects/:id/video-projects/available` — lists user video projects available to link.
      - `POST /api/team-projects/:id/video-projects/create` — creates a new video project in `projects`, links it to workspace, and grants access to all workspace members.
      - `POST /api/team-projects/:id/video-projects/link` — links an existing project and syncs access.
      - `DELETE /api/team-projects/:id/video-projects/:projectId` — unlinks project from workspace.
    - [x] **New "Project" Tab**:
      - In [`TeamProjectWorkspace.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/3_teams/team_project/TeamProjectWorkspace.tsx), placed the new **Project** tab (`Film` icon) directly after **Taskboard** (`Overview` → `Taskboard` → `Project` → `Submissions` → `Contract & Members` → `History` → `Chat`).
      - Created [`ProjectVideoTab.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/3_teams/team_project/ProjectVideoTab.tsx) displaying linked video projects, technical aspect metadata (`1080 × 1920 9:16`, `1920 × 1080 16:9`), duration, team collaborator access chips, an "Open in Video Editor" button (handoff to `/projects/open/:projectId`), plus modal workflows for "Link Existing Project" and "Create New Project".
    - [x] **Zero changes to `video-editor/`**: Preserved the `video-editor` directory unchanged; authorization is satisfied declaratively through `project_members`.
    - [x] Preserved the rule: “don't commit unless i say so”.
    - [x] Verified full build with `npm --prefix frontend run build` passing cleanly with 0 errors.
