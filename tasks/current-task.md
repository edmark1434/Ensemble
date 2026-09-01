# Current Task — Remove Asset Project-Link Submission

Keep template assets thumbnail-based with optional original package files, while removing support for project links from asset create and update payloads.

## Acceptance Criteria

- [x] Template assets still accept carousel thumbnails.
- [x] Template assets still accept optional original files.
- [x] Empty or omitted project-link lists remain compatible.
- [x] Non-empty project-link lists are rejected by backend validation.
- [x] Backend syntax check and scoped diff check pass.

## Implementation Notes

- The frontend asset editor already has no project-link field, so no frontend change is required.
- Project links are rejected at the service boundary to prevent manually crafted requests from adding them.
- Existing optional template original-file and preview handling is unchanged.

Status: Completed.

## Verification

- node --check services/AssetServices.js passed.
- Scoped git diff --check passed.
