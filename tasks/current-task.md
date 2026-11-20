# Optimize editor media loading and eliminate Loading media flashes

## Implementation objective

Eliminate or minimize `"Loading media…"` flashes across uploads, images, market assets, and video cuts in the video editor using optimistic local previews, background pre-decoding/prefetching, longer video lookahead, frame-hold during seeks, and a delayed spinner threshold.

## Acceptance criteria

- Local files dropped or uploaded render immediately in the canvas from browser-local `blob:` URLs while uploading (with an unobtrusive corner upload progress badge), probe true dimensions/duration locally, and alias the final cloud URL to the same blob so upload completion causes zero flicker or re-download.
- Market images proactively prefetch and decode in the background (bounded concurrency) instead of waiting until the playhead mounts each frame.
- Regular images (uploads, Pexels) track decoded URLs and pre-decode in the background so remounting on cuts/scrubs renders instantaneously without a 1-frame loading flash.
- Video clips premount 3 seconds ahead of the playhead (and stay mounted 2 seconds behind), hold their last decoded frame during brief seeks/waits instead of hiding behind `"Loading media…"`, and check `readyState >= 2` on mount.
- `MediaPlaceholder` uses a 600ms grace delay (`delayMs={600}`) for the spinner text while keeping the 50% opacity preview thumbnail visible immediately for both images and videos.
