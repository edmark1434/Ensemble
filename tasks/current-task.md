# Current Task: Multi-freelancer Team Job Posting with Milestone Roles & Proposal Selection

## Objective
Enable clients to create multi-position team jobs with structured milestone roles (each with title, description, tasks list, slots, budget share percentage, and duration hours). Enforce that all timeline hours are assigned across milestones, allow auto-balancing both budget and hours, and provide full validation in the team job creation wizard.

## Implementation Steps & Acceptance Criteria
1. **Database Schema (Migration)**:
   - Migration `1823000000000_create-job-milestones-and-team-hiring.js`: created `job_milestones` table with `slots_count`, `budget_percentage`, etc.
   - Migration `1823000000001_add-duration-hours-to-job-milestones.js`: added `duration_hours` column to `job_milestones`.
2. **Backend API**:
   - `JobRepositories.js`: supports creating team jobs with `duration_hours` per milestone, retrieves it across job queries and proposal queries.
3. **Frontend Step 2 (Budget & Timeline)**:
   - For team job posts, display only a single "Project Timeline (Days)" input (the max days).
   - Fixed tooltip `z-index` and position (`z-50`, right-aligned) to prevent clipping.
4. **Frontend Step 4 (Team Milestones & Roles Allocation)**:
   - Summary Allocation Bar organized into 2 clean rows:
     - Row 1: Total Budget | Total Openings
     - Row 2: Budget Allocation (with Balanced / X% left badge) | Project Timeline (with Balanced / X hrs left badge).
   - Milestone Cards:
     - Top row with Freelancer Slots & Milestone Hours (with ~X days equivalent).
     - Bottom row with Budget Share (%) spanning full width.
     - Live validation indicators: `Required` (red) if 0, `Too low (>X hrs)` (amber) if below 20% equal threshold.
   - Auto-Balance button:
     - Automatically distributes both Budget Share (%) to 100% and Milestone Hours to total project hours (`timelineDays * 24`).
   - Advance Validation:
     - Cannot proceed if any milestone has 0 hours or hours below the minimum threshold.
     - Cannot proceed if total allocated hours do not match total project timeline hours.
5. **Frontend Proposal Review UX & Team Roster Selection**:
   - Two-phase selection funnel: Pending -> Shortlisted -> Hired & Slotted.
   - Clicking "Slot & Accept" on candidate cards or selecting from the role dropdown navigates the client to `/jobs/proposals/received/:proposalId` to review deliverables, agree to terms, deposit escrow, and send the contract offer.
   - Candidate is only marked and occupied in the milestone slot once the freelancer accepts the contract offer (status becomes `Hired`).
   - If offer has been sent but not yet accepted, card displays "Offer Sent (Awaiting Acceptance)" without pre-filling the slot.
6. **Contract Details, Deliverable Tasks Checklist & Progress Indicators**:
   - Backend contract repository (`ContractRepositories.js`) and proposal repository (`JobRepositories.js`) expose `target_milestone_tasks` (`jsonb` array of tasks from `job_milestones`) and `job_all_milestones`.
   - Proposal offer view ([`proposals_view_details_as_applicant.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_proposals/proposals_pages/proposals_view_details_as_applicant.tsx)) and Formal Contract modal ([`contracts.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/contracts/contracts.tsx)) render the assigned role's Deliverables / Tasks Checklist in Section II (Scope of Work).
   - Contract list cards in [`contracts.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/contracts/contracts.tsx) redesigned with:
     - Role badge (`Users` icon + milestone role title).
     - Smooth milestone progress bar with completion percentage and segmented milestone dots.
     - Dedicated Deliverables & Tasks preview container displaying the checklist items and completion status.
     - Light/dark mode friendly tooltips and action buttons.
