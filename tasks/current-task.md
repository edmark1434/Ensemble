# Active Task: Application Windows, Auto-Expiration, Credit Refunds, Profile Features, & Marketplace SQL

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
- [x] Focused processing checks and editor type check; browser checks are left to the user.

## Verification

- Checked the marketplace listing fee query against the migration-defined `credit_transactions` schema and updated it to use valid columns. No build or tests run for this SQL correction.
- The migration `1824600000000_pending-media-derivatives` was applied to the confirmed local development database. A rollback-only regression check reproduced SQL error 23502 under the old constraint, then created video, audio, and image listings, checked pending/failed/ready states and publication, and ran the image worker with in-memory storage. All test data was rolled back and no storage objects were created.
- Backend video/image processing: 11 tests passed, including audio retention, same-size proxies, rotation, non-square pixels, and a higher-resolution watermark-only input.
- Editor video normalization: 8 tests passed, including landscape/portrait/square/ultrawide, unchanged smaller sources, rotation, non-square pixels, and invalid input rejection.
- Editor `npm run typecheck`, changed backend JavaScript syntax checks, and focused `git diff --check` passed.
- No browser checks, full builds, live S3/database uploads, or existing-asset conversions performed. New-upload browser verification remains with the user.

### Previous Asset Creation Findings

Video/audio creation inserted NULL proxy/thumbnail IDs while both columns were NOT NULL in the local database. The latest 433 KB image spent 150 seconds between upload finalization and listing creation. A read-only storage download did not finish within 25 seconds.
