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
5. **Frontend Proposal Review UX**:
   - Two-phase selection funnel: Pending -> Shortlisted -> Accepted (Slotting).
