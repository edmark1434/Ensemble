# Current Task — Remove Carousel Thumbnail Watermarks & Account activity system

Remove the “Ensemble Preview” watermark from marketplace carousel thumbnails without weakening protected previews of original asset files.
Add `account_activity` table, write events from key moderation/account actions, expose APIs, and show feeds on Admin + designated moderator UIs.


## Acceptance Criteria

- [x] Image/video/audio listing thumbnails are generated without a watermark.
- [x] Template carousel thumbnails remain watermark-free.
- [x] Image, video, audio, PDF, and ZIP original-file previews remain watermarked.
- [x] Frontend build and scoped diff checks pass.
- [x] Migration creates `account_activity` (UUID PKs, polymorphic refs, actor, indexes).
- [x] Helper to insert activity; wire warn/pardon/restriction/status (+ related) writes.
- [x] Admin + moderator APIs list activity by account / recent feed.
- [x] UI surfaces on Admin user/team history and moderator restrictions desks.

## Implementation Notes

- Thumbnail generation and document/archive preview generation now use separate derivative helpers.
- Existing uploaded thumbnails are unchanged; newly uploaded or replacement thumbnails use the watermark-free behavior.
- Protected original-file previews and the original-preview modal watermark remain unchanged.

Status: Completed.

## Verification

- `npm run build` passed in `frontend`.
- Scoped `git diff --check` passed.

