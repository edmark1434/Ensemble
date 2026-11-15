# Active Task: Free 1080p uploads with 720p exports
# Active Task: Fix Team Taskboard, Video Projects Loading, and Invitation Approval Flow

## Implementation Objective

Raise Free video upload quality to 1080p for both the asset library and editor while keeping its separate export limit at 720p.
1. Fix task creation and saving errors in Team Taskboard by passing `teamId={team.team_id}` from `SelectedTeam.tsx` and adding defensive fallback handling in `TeamTaskboard.tsx`.
2. Fix infinite skeleton loading in Team Video Projects by passing `teamId={team.team_id}` from `SelectedTeam.tsx` and adding fallback resolution and proper loading termination in `TeamVideoProjectsTab.tsx`.
3. Fix team invitation flow so that invited users do NOT automatically appear in the active Members tab upon invitation. Instead, the invited user accepts the invitation to request to join (`status = 'Pending'`), which then appears in the team owner's Pending Requests tab for review and approval.

## Acceptance Criteria

- The original unapplied upload-feature migration seeds Free video_upload_resolution at 1080p. Premium remains 1080p and Business 4K. Free export_resolution stays 720p. Include reversible down behavior.
- The plans page displays the database-backed feature immediately after personal_upload_storage.
- Asset-library video finalization resolves the uploader's active/trialing subscription (or Free fallback) and reads the configured upload feature from PostgreSQL.
- Editor file and URL video uploads read video_upload_resolution independently of export_resolution.
- Oversized videos are downscaled using the existing normalizer, preserving aspect ratio, orientation handling and the no-upscaling rule.
- Existing uploads, images, export quality/FPS limits and watermark logic remain unchanged.
- Upload notices and upgrade suggestions reflect actual upload limits. Missing/invalid current values do not fall back to hardcoded limits or grant uncapped uploads.
- Preserve existing user changes; do not run builds, type checks, lint, tests or other verification commands.

## Implementation Status

- User confirmed the original migration has not run. Updated its Free seed directly to 1080p and removed the unnecessary follow-up migration. Existing database-driven display and enforcement pick up the change after migration.
- Added backend/migrations/1828500000000_video-upload-resolution-plan-feature.js with up/down seed behavior. The legacy Studio name receives the same seed as Business.
- Added video_upload_resolution after storage in the plans-page feature order.
- Replaced hardcoded asset-library tier caps with repository reads and strict service parsing. Existing FileServices video normalization now consumes that dynamic policy.
- Added a dedicated editor upload-limit reader used by prepareVideoUpload for file and URL imports.
- The editor policy response retains export maxHeight/maxWidth and adds maxUploadHeight/maxUploadWidth. Upload notice text and upgrade suggestions now use the separate upload feature.
- Updated architecture/API documentation.
- Migration prepared, not applied. Apply backend migrations before deploying this code; the new feature is required by the policy readers.
- No builds, type checks, lint, tests or other verification commands run.
