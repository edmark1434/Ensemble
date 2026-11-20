# Task: Missed-review window is 24 hours

## Implementation Objective
A member who does not review the other party within 24 hours of a contract ending gets the automatic `missed_review` warning (was 7 days).

## Acceptance Criteria
- `REVIEW_WINDOW_HOURS = 24` in `MissedReviewServices`; reminder goes out with 6 hours left; warning issues after the deadline and at least 6 hours after the reminder.
- Warning reason, catalog notes (backend, frontend, `warning_defs` via new migration), and docs say 24 hours.
