# Current Task

## Objective

Fix 9 production and editor issues across `video-editor`, `backend`, and `ensemble-render-server`:
1. Licensed GIFs failing Remotion Lambda export with S3 CORS errors.
2. Unlicensed GIF proxies not syncing to the editor playhead and playing too fast in exports.
3. Slow media reloading when navigating into and back out of scenes.
4. Clunky scene duration sync and neighboring timeline item movement.
5. Non-draggable assets inside market asset bundle details (and single-asset collection cards).
6. Missing local preview on timeline items while uploads are still in progress.
7. Large videos failing to load timeline filmstrip thumbnails.
8. In-editor template preview links redirecting to `localhost:4002` in production.
9. Project invitation email links pointing to `localhost` in production.

## Acceptance Criteria

- `ensemble-render-server` prepares GIFs for video, image-sequence, still image, and thumbnail renders, resolves bundled/env/PATH `ffmpeg`/`ffprobe`, handles missing/N/A/zero packet durations cleanly, and matches `response-content-type=image/gif` signed URLs.
- `backend` generates animated watermarked proxies as real `.gif` files (`assets/proxies/v2-anim-gif/*.gif`) and backfills prior animated-WebP GIF proxies so unlicensed GIFs render via `<Gif>` in the editor and `PreparedGifVideo` in exports.
- Prepared market image blobs, market license lookups, upload availability queries, audio PCM buffers, and timeline image/video thumbnails persist across scene enter/exit instead of being evicted or refetched.
- Scene duration sync uses trailing debounce, `onFirstSync`, true item max duration, collision-only ripple pushing on growth (preserving gaps and leaving neighbors put on shrink), accurate project duration recalculation, and transition reconciliation.
- Ready assets in `MarketAssetDetails` (bundles) and single-asset cards in `MarketAssetListings` are wrapped in `<Draggable>` with normalized payloads matching the main lists.
- Timeline `Image`, `Video`, and `Audio` items render immediately from `local-media-cache` during `pending-upload:` and keep their rendered preview seamlessly when upload finishes.
- `videoFilmstrip` uses `preload="metadata"`, captures frame 0 on `loadeddata` as an immediate fallback, isolates per-seek failures with bounded retries, and allows 2 concurrent extractors so big videos still load previews reliably.
- Editor redirects (`/api/market-templates/[id]/preview` and `proxy.ts`) resolve public origin from `x-forwarded-host`/`host` + `x-forwarded-proto` rather than internal `request.url`.
- Project invite emails never fall back to `localhost` when `FRONTEND_URL` is a non-local origin.
