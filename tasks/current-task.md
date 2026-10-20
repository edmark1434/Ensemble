# Current Task: Complete Job Market & Proposal Enhancements Suite

## Objective
Implement all requested Client & Freelancer improvements across Job Creation, Proposal Pitching, Negotiation, and Post Lifecycle:

### 0. Local Auto-Save Drafts & Reset on Job Post Creation
- **Job Creation Draft Caching**: Auto-saves form progress into `localStorage` (`ensemble_job_create_draft`).
- **Restore & Clear Banners**: Detects existing drafts and provides a 1-click "Reset / Clear Draft" action or restores previously drafted job details.
- **Auto-Clearing**: Automatically flushes cached draft from `localStorage` upon successful job publication.

### 1. Client Improvements (Job Post Creation & Management)
- **1.A Screening Questions / Dealbreaker Criteria**:
  - Clients can configure 1–3 custom screening questions (e.g., portfolio links, framework experience) during Job Creation Step 1.
  - Freelancers submitting proposals must provide text answers for each screening question.
  - Clients view applicant answers prominently in incoming proposal details and matrix.
- **1.B Multiple Project Brief Attachments & Reference Files**:
  - Clients can upload project brief files (PDFs, ZIPs, moodboards, specs) alongside the thumbnail.
  - Stored in `job_attachments` with indexes > 0.
  - Displayed with direct CloudFront download links and size badges on the job posting full page (`job_full_page.tsx`).
- **1.C Milestone Pre-Scoping for Single-Hire Jobs**:
  - Clients posting single-hire jobs can outline a suggested milestone roadmap (phase title, percentage, summary).
  - Proposal creation flow auto-adopts the client's pre-scoped roadmap as starting milestones for the freelancer.
- **1.D Side-by-Side Proposal Comparison Matrix & Sidebar Toggle Collapse**:
  - In `proposals_incoming_page.tsx`, clients can toggle between **Cards View** and **Comparison Matrix View**.
  - Matrix table displays freelancer rating, proposed bid vs. job budget percentage, milestone phases, answered screening questions count, attached work samples count, status badges, and quick actions (Shortlist toggle, Discussion Chat, and Full View).
  - Opening the Comparison Matrix auto-collapses the Proposal Statuses & Filter sidebar to provide 100% full horizontal width for table columns.
  - Interactive **Toggle Sidebar** (`PanelLeftClose` / `PanelLeftOpen`) button and in-matrix status pills enable expanding/collapsing filters and filtering by status directly.
- **1.E Unified Budget Benchmark & Tag Display System**:
  - Centralized budget formatter (`getBudgetDisplayInfo` in `frontend/src/lib/formatBudget.ts`).
  - Distinguishes Open Bid (`600+ Credits` with `Open Bid` tag), Ranged Budget (`600 – 800 Credits` with `Ranged Budget` tag), Fixed Price (`8,000 Credits` with `Fixed Price` tag), Milestone Pool (`Milestone Pool` tag), and Multi-Hire (`Per Hire` tag).
  - Applied across Job Full Page, Job Preview Modal, Market Grid/List cards, Recommendation cards, and Proposal Pitch steps.

### 2. Freelancer Improvements (Proposal Creation & Transparency)
- **2.A Direct Portfolio & Work Sample Attachments**:
  - Freelancers can upload up to 3 work samples/case studies directly within Proposal Step 1.
  - Backed by `proposal_attachments` table with indexed `proposal_id` and `file_id`.
  - Clients can view and download attached files in incoming proposal review.
- **2.B 1-Click Milestone Quick-Fill Templates**:
  - Single Milestone (100%), 2 Phases (40/60%), 3 Phases (25/45/30%), and Dev + QA (70/30%) presets with automated hour/credit allocation.
- **2.C Proposal Auto-Save Drafts**:
  - Keyed by `jobId` in `localStorage` with prompt restore banner and clear option.
- **2.D Job Activity Insights (Transparency)**:
  - Displayed on `job_full_page.tsx`: proposals received, shortlisted candidates count, client hire rate %, and client last active time.
- **2.E Proposal Fee Refund on Abandoned Jobs**:
  - In `deleteJobRepositories`, if a client deletes or cancels a job with 0 hires, all applicants receive a full 10-credit proposal fee refund credited from the platform wallet with transaction type `'Proposal Fee Refund'`.

### 3. Negotiation & Bridge Improvements
- **3.A Counter-Offers & Milestone Editing During Offer Creation**:
  - Clients sending contract offers can customize and edit milestone deliverables, hours, and revisions in the modal before contract finalization.
- **3.B Read Receipts / Micro-Status Tracker on Sent Proposals**:
  - Freelancers tracking submitted proposals in Sent Proposals and Proposal Details see a clear micro-status tracker:
    `Submitted` → `Viewed by Client` (`viewed_at`) → `Shortlisted` (`shortlisted_at`) → `Hired / Contract Offer`.

## Verification & Status
- [x] Database migration `1824100000000_make-job-rate-credits-max-nullable.js` applied.
- [x] Database migration `1824200000000_job_market_complete_enhancements.js` applied.
- [x] Both light and dark modes adhere strictly to Ensemble design tokens with high contrast and no gradients.
- [x] `npm run build --prefix frontend` passes with zero errors and zero warnings.
