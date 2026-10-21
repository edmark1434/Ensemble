# Current Task: Jobs & Gigs Verification Gate Button Behavior + Flow Scoring

## Objective
1. Ensure that on both Jobs and Gigs detail views (slide-out drawer routes `/jobs/postings/:id` & `/gigs/services/:id` and standalone full-page routes `/jobs/postings/:id/page` & `/gigs/services/:id/page`), if the user is not verified, the action button ("Send Proposal" on Jobs, "Order ..." / "Continue ..." on Gigs) remains clickable with active styling and triggers the existing verification prompt (`VerificationRequiredModal` via `continueIfAccountVerified`).
2. Ensure `VerificationRequiredModal` overlays slide-out drawers properly (`z-[200]` above `z-[101]`).
3. Score and provide improvement recommendations for:
   - Job Posting Flow
   - Sending Proposal Flow
   - Posting Gigs Flow
   - Ordering Gigs Flow

## Acceptance Criteria
- [x] Unverified logged-in users see an active, clickable "Send Proposal" button on `/jobs/postings/:id` and `/jobs/postings/:id/page` that opens `VerificationRequiredModal` when clicked.
- [x] Unverified logged-in users see an active, clickable Order / Continue button on `/gigs/services/:id` and `/gigs/services/:id/page` that opens `VerificationRequiredModal` when clicked.
- [x] `VerificationRequiredModal` renders above open Job/Gig drawers.
- [x] `cd frontend && npm run build` passes cleanly.
