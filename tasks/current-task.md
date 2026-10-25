# Current Task: Align Marketplace Listing Fee SQL With Schema

## Objective
Resolve the `credit_transactions` schema mismatch in marketplace listing fee creation and clarify expected IDE warnings in the restructuring migration.

## Acceptance Criteria
- [x] Listing fee insertion uses the actual `credit_transactions` columns.
- [x] Confirm migration references to legacy tables occur before those tables are dropped in the same migration.

Verification: checked migration definitions and repository SQL; no build or tests run.

## Previous Asset Creation Fix
- [x] Add a migration permitting pending derivative references and image processing jobs.
- [x] Save image listings before preview generation; start the durable worker with the backend.
- [x] Display and refresh processing states; publish only when previews are ready.
- [x] Verify creation in rollback-only transactions and run focused worker checks. Browser checks stay with the user.

## Previous Completed Work
- [x] Site video uploads finalize a capped original before the uploaded file is usable.
- [x] Editor file and URL video uploads persist capped originals and return their actual URL/dimensions to the client.
- [x] Market video proxies only overlay the watermark on the finalized original and have identical dimensions.
- [x] Preserve aspect ratio and portrait orientation; use server-probed metadata and handle failures without publishing incomplete files.
- [x] No editor sizing changes, image-original resolution caps, or premium behavior.
- [x] Focused processing checks and editor type check; browser checking is left to the user.

## Verification
Current findings: video/audio creation inserts NULL proxy/thumbnail IDs, but both columns are NOT NULL in the local database. The latest 433 KB image spent 150 seconds between upload finalization and listing creation. A read-only storage download did not finish within 25 seconds.

Applied `1824600000000_pending-media-derivatives` to the confirmed local development database. The rollback-only regression script reproduced SQL error 23502 under the old constraint, then created video/audio/image listings in 64/15/16ms, checked pending/failed/ready states and publication, and ran the image worker with in-memory storage. All test data was rolled back and no storage objects were created. Frontend TypeScript and changed backend syntax checks passed. Browser verification remains with the user.

Previous verification:
- Backend video/image processing: 11 tests passed, including audio retention, same-size proxies, rotation, non-square pixels, and a higher-resolution watermark-only input.
- Editor video normalization: 8 tests passed, including landscape/portrait/square/ultrawide, unchanged smaller sources, rotation, non-square pixels, and invalid input rejection.
- Editor `npm run typecheck`, changed backend JavaScript syntax checks, and focused `git diff --check` passed.
- No browser checks, full builds, live S3/database uploads, or existing-asset conversions performed. New-upload browser verification remains with the user.
- Editor runtime requires FFmpeg on PATH (already available locally) or `FFMPEG_PATH`; documented in `docs/architecture.md`.
