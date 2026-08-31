# Current Task — Add Verification Support Knowledge

Create a detailed, source-grounded verification guide for the AI support assistant and register it for documentation ingestion.

## Acceptance Criteria

- [x] The guide distinguishes signup email, personal identity, and Team business verification.
- [x] Personal and Team requirements, steps, statuses, resubmission, review estimates, and safety guidance are documented.
- [x] Verified benefits and unverified restrictions match implemented platform behavior without claiming unsupported guarantees.
- [x] Relevant user navigation routes are included.
- [x] The source is enabled in the RAG documentation catalog.
- [x] Documentation ingestion and focused semantic retrieval are verified.

Status: Completed August 31, 2026.

## Implementation Notes

Added a dedicated verification knowledge source based on the personal verification status flow, Didit status processing, Team business verification validation, marketplace eligibility checks, and current frontend navigation. The guide separates email activation, personal KYC, and Team business review; documents required evidence and file limits; explains statuses, benefits, restrictions, expiration, resubmission, troubleshooting, and privacy; and avoids promising approval, deadlines, credits, subscription upgrades, or escrow effects.

Registered the guide as an enabled RAG source at `/account-verification-status`.

## Verification

- `sources.json` parsed successfully as JSON.
- `npm run rag:ingest` completed successfully for 20 sources and ingested 24 guide chunks.
- The document store contains 131 chunks after ingestion.
- Focused searches for unverified restrictions, Cooperative documents, and Team Admin eligibility all ranked the new verification guide first.
- Scoped `git diff --check` passed with only line-ending notices.