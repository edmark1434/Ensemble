# Current Task: Fixed 1-year verification approval

## Objective
Remove duration choices from verification approval. Staff get one Verify action that always lasts 1 year, with that length labeled on the review screen.

## Acceptance Criteria
- The verification modal has no 30/90/180/365/730-day or custom-day controls.
- The action button is labeled Verify, and the screen states that verification lasts 1 year from approval.
- Backend approval always stores a 365-day expiry, including when a client sends another `validityDays` value.
