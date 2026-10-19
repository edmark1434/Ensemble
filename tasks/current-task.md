# Current Task: Fix 500 Internal Server Error when Sending Proposal to Team Job

## Objective
Diagnose and resolve the 500 Internal Server Error occurring at `POST /api/jobs/:jobId/proposals` when submitting a proposal to a team job from `proposals_create_page.tsx`.

## Acceptance Criteria
- [x] Investigate `proposals_create_page.tsx` payload sent to `POST /api/jobs/:jobId/proposals`.
- [x] Inspect backend route `POST /:jobId/proposals`, controller, service, and repository.
- [x] Identify root cause of the 500 error on team job proposals (e.g. milestone validation, role selection, team job specific columns/tables, database constraints).
- [x] Fix PostgreSQL 22P02 invalid input syntax for type uuid: "default-standard" in Terms of Service selection.
- [x] Implement fix preserving controller -> service -> repository separation.
- [x] Verify fix works without breaking individual job proposals.
- [x] Strictly do NOT git commit unless explicitly commanded by user.
