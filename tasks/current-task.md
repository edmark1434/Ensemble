# Active Task: Restore market video timeline thumbnails

## Implementation Objective

Restore timeline filmstrips from the five-second market video previews. The user confirmed native eager video playback no longer stutters; preserve that playback behavior. No new test suites at the user's request.

## Acceptance Criteria

- [x] Initialize tile dimensions from decoded MP4 metadata rather than the removed still-image loader.
- [x] Seed a fallback tile from the preview's first frame and redraw the filmstrip after preparation.
- [x] Missing frames do not prevent drawing subsequent tiles; failed image decoding releases the pending batch.
- [x] Only short market previews supply thumbnails; originals and playback remain unchanged.
- [x] Editor TypeScript compile check passed. Timeline appearance awaits confirmation in the running editor.

CloudFront delivery is implemented but disabled pending AWS configuration. It is not required for native direct S3 playback. No AWS configuration was changed. Earlier code checks passed; do not run further test suites for this task at the user's request.
