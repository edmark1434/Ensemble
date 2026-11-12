# Active Task: Restore Fee management rows + wire posting fees

## Implementation Objective

Bring back all previously removed Economy → Fee management rows, and wire the posting/listing ones into the live charge paths that were still hardcoded.

## Acceptance Criteria

- [x] All original fee rows are back in defaults, admin UI, and allowed ID list.
- [x] Job posting fee reads `fee-job-post` (fallback 50 credits).
- [x] Gig/service posting fee reads `fee-gig-create` (fallback 50 credits).
- [x] Asset listing fee can use `fee-asset-upload` as fallback for listing credits.
- [x] Public config exposes posting fee amounts for checkout UI.
- [x] Frontend typecheck passes.
