# Current Task: Full Page View for Job Posts with "Other Job Posts You May Like"

## Objective
1. Implement a full-page view for Job Posts at `/jobs/postings/:id/page` (supporting both Individual and Team job postings) following the layout structure of `/gigs/services/:id/page`.
2. Do NOT include "Rates & Reviews" section (jobs do not have ratings/reviews like gigs).
3. Include an "Other Job Posts You May Like" section at the bottom, rendering up to 3 active matching job posts in grid layout with navigation to their full page.
4. Add backend `GET /api/jobs/:jobId` to fetch single job details directly.
5. Add a "View Full Page" (`Maximize2`) button in the existing `JobViewDetails` drawer.

## Acceptance criteria
- [x] Backend route `GET /api/jobs/:jobId` implemented and returns full job details.
- [x] New `JobFullPage` created at `frontend/src/pages/user/6_job_market/job_pages/job_full_page.tsx`.
- [x] Registered `/jobs/postings/:id/page` and `/jobs/:id/page` in `App.tsx`.
- [x] Full page layout contains:
  - Sticky header with `UserHeader` and Back to Job Market button.
  - Left column: Status, difficulty, category, and Team/Individual badges; title, post metadata, edit/report actions; thumbnail with skills overlay & lightbox; description (RichText); team milestones (if team project); required skills.
  - Right column: Poster profile card (Client / Team), budget card with price, timeline, deadline, openings, proposal status and action button ("Send Proposal", "View your Proposal", "Manage Applicants", etc.), workflow & NDA terms.
  - Bottom section: "Other Job Posts You May Like" component (`jobs_other_posts.tsx`) featuring 3 job cards matching `/jobs/postings` grid style.
  - No "Rates & Reviews" section.
- [x] `JobViewDetails` drawer includes a "View Full" button on the bottom left (matching the Gig drawer) and header thumbnail button navigating to `/jobs/postings/:id/page`.
- [x] Frontend build succeeds without errors (`cd frontend && npm run build`).
