# Active Task: Application Windows, Auto-Expiration, Credit Refunds, & Contract Timelines

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
   - [x] Overhauled **Required Skills** in [`SkillsAutocomplete.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_components/job_creation_components/SkillsAutocomplete.tsx):
     - Trigger button and modal title: "Set Skills with Joed AI" (no icons).
     - Gray notice box for database tag verification.
     - Project Scope is display-only.
     - Cooldown notice formatted identically to other Joed modals.
     - Generation button is "Generate" (no icon), only executed after confirmation.
   - [x] Redesigned Review & Post Section 03 in [`3_create_review.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_components/job_creation_components/3_create_review.tsx):
     - 4 crisp, high-contrast, bold metric cards for Budget Range, Application Intake Window, Timeline, and Final Deadline.
     - Visual **Project Schedule Map** bar embedded showing Application %, Timeline %, Buffer %, and Deadline cutoff in Plus Jakarta Sans font.
     - Crisp Required Skills display with requirement indicator.
     - Completely removed the legacy "Pre-Scoped Milestones & Delivery Roadmap" section.
   - [x] Upgraded **Project Brief & Reference Documents** with rich previews in both:
     - **Step 1** ([`1_create_coreinfo.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_components/job_creation_components/1_create_coreinfo.tsx)): visual preview cards with removal action (`X`), accurate file sizes (`KB`/`MB`), and lightbox modal inspection.
     - **Review & Post** ([`3_create_review.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_components/job_creation_components/3_create_review.tsx)): rich cards with fullscreen lightbox and download options.
   - [x] Maintained strict rule: "don't commit unless i say so".
