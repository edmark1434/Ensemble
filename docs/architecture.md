# Architecture

## Runtime components

- The frontend is a React/Vite single-page application served separately from the API. The same build serves the member site, `admin.ensemble.software`, and `staff.ensemble.software`. See `docs/frontend.md` for the host split.
- `backend/Server.js` creates one HTTP server shared by Express and Socket.IO.
- The API is mounted at `/api` through `backend/routes/Api.js` and normally listens on port `4000`.
- The local frontend normally runs on port `5173`; production origins come from environment configuration.
- PostgreSQL stores relational/business data. MongoDB is used by features that need document-oriented storage. Redis supports transient/shared state.
- `backend/lib/BackgroundJob.js` starts reconciliation work after database connections initialize.
- Asset previews (images, videos, audio) run through `media_asset_jobs` after listing creation. Pending proxy/thumbnail references are nullable. The backend drains one job at a time every three seconds; set `MEDIA_WORKER_EMBEDDED=false` when running the separate `npm run media:worker` process. Listings remain drafts until previews finish, and the asset UI polls processing records for completion or failure.
- ffmpeg / ffprobe resolve as `FFMPEG_PATH` / `FFPROBE_PATH`, else the `ffmpeg-static` / `ffprobe-static` binary only if its file exists (its download can be skipped by `--ignore-scripts` or fail), else `ffmpeg` / `ffprobe` on `PATH` (`lib/MediaProcessing.js`). A missing tool is `MEDIA_TOOLS_MISSING`, not the file's fault: the job goes back to the queue without using an attempt, video and audio jobs pause for 60 s per process while image jobs keep running, and at start-up (embedded cron and `media:worker`) jobs that failed with `spawn …ffmpeg ENOENT` are re-queued once the tools work (`recoverMissingToolFailures`). Fix a server with `npm rebuild ffmpeg-static ffprobe-static`, a system ffmpeg, or the env paths. Staff desks show job errors through `describeProcessingError` (no server paths).

## Video upload normalization

- New market video originals are normalized during upload finalization in `backend/services/FileServices.js`, before a file record is returned. Editor file and URL uploads use `video-editor/src/lib/video-upload.ts` before creating their media record.
- Video originals use the uploader's `video_upload_resolution` plan feature, independently of export quality. Upload defaults are Free 1080p, Premium 1080p and Business 4K (1920x1080, 1920x1080 and 3840x2160 bounds, reversed for portrait). Free exports remain capped separately at 720p. Both sides are bounded while preserving aspect ratio and never enlarging smaller videos. Rotation and non-square pixels are baked into the finalized video; its probed dimensions and URL are authoritative. Image originals are unchanged.
- Market video proxies only add the watermark at the finalized original's exact dimensions. Resolution policy stays in upload finalization, not proxy creation. Backend `UploadPolicyServices` and editor `upload-policy` resolve the newest active/trialing, unexpired subscription and its upload feature from the database, falling back to the Free plan when there is no current subscription. Client plan values are never accepted. Upgrade notices use the next higher tier with a larger configured upload limit; missing/invalid current limits prevent video finalization.
- Market video thumbnails are separate silent, unwatermarked H.264 MP4 previews: first five seconds (or the entire shorter clip), 15 fps, fitted within 480px on the longest side without upscaling. They live under `assets/thumbnails/video-5s-480/`; image thumbnails are WebP fitted within 640px under `assets/thumbnails/640/`, also without upscaling. Audio previews remain 30-second MP3s. `BackfillMediaThumbnails.js --type=image` and `--type=video` replace older thumbnails without modifying originals or full watermarked proxies. Preview consumers accept both legacy 320px and current 480px video paths.
- Editor menus play these small video previews on hover/focus. Timeline filmstrips sample the short preview across the clip's width, so they are representative preview frames rather than exact full-length frame references. Old saved timeline items resolve their current generated preview through the authenticated `/api/market-assets/:id/thumbnail?mediaAssetId=...` endpoint; project documents remain unchanged.
- Separately uploaded showcase images reuse the original file as their thumbnail, without resizing or recompression. The image worker extracts orientation-aware width/height into their media records. Image content linked as a showcase still uses its generated thumbnail to preserve protected originals. The image thumbnail backfill also repairs older standalone showcase references and dimensions.
- The editor server needs FFmpeg on `PATH` or `FFMPEG_PATH` set to its executable. FFprobe is bundled by `ffprobe-static` (override with `FFPROBE_PATH`). The backend bundles both binaries and supports the same overrides.
- Normalization happens before upload completion, so large videos can take longer after transfer reaches 100%. Upload-intent expiry is checked when finalization is claimed, not again after encoding. Existing uploads are not retroactively converted.

## Backend dependency direction

`route → controller → service → repository → database/provider`

- Routes define HTTP method, path, middleware, and controller.
- Controllers translate HTTP input/output and delegate business behavior.
- Services own validation, workflows, idempotency, transactions, notifications, and provider orchestration.
- Repositories own SQL or persistence operations and return data rather than HTTP responses.
- Shared infrastructure belongs under `backend/lib/` or focused middleware.

Do not introduce reverse dependencies, SQL in React/controller files, or Express response objects in repositories.

## Editor exports and frame rendering

- Editor export routes verify the signed editor session. The server-only render bridge sends `INTERNAL_API_SECRET` and the verified user ID; render creation also sends the current subscription tier from the database (Premium maps to the renderer's `pro` tier).
- The editor's "made in ensemble" branding follows the viewing/exporting user's plan, including collaborative projects. Free visual exports require it; Premium/Business can omit it. It is a final composition overlay, never a timeline item or shared project setting. Export submission rechecks the database and overwrites the client flag; audio is excluded. The companion renderer patch in `tasks/render-server-ensemble-watermark.patch` must be applied and all local/Lambda composition bundles updated before the patched renderer starts advertising support. The editor blocks branded exports against an older renderer. Marketplace licensing remains independent.
- The render service rejects unauthenticated requests and checks job ownership for progress and cancellation. Local output downloads use expiring signed links. The browser never receives the render server's output link: `GET /api/render/[id]` rewrites a completed job's `videoUrl` to `/api/render/[id]/download`, which re-checks the session and job ownership and streams the file (the render server is internal, e.g. `127.0.0.1`). Resolution/FPS limits and queue routing remain plan-based; export duration has no plan limit.
- Editor and render-server compositions cache timeline grouping and a frame-range index. Image/text/caption content is built only when its sequence is active, including transition and nested-scene content. Editor videos retain eager mounting.
- Local rendering bundles the current renderer source on startup unless `REMOTION_SERVE_URL` is configured. Lambda uses the separately deployed bundle at `REMOTION_LAMBDA_SERVE_URL`; renderer source changes require redeploying that bundle.

## Realtime behavior

Socket.IO is initialized once in `backend/lib/WebSocket.js`. Persist authoritative state before emitting. Events should contain stable IDs, timestamps, and enough normalized data for clients to update without guessing. Reconnects must recover state through an API query rather than depending solely on missed events.

Staff consoles are live end to end. Every staff socket joins `staff:cases` and hears `staffCaseChanged` (one ticket, dispute or report) and `staffDataChanged` (which areas changed). The second comes from one place for HTTP writes (`middleware/StaffLiveUpdates.js`, after the response) and from `announceJobChange` in `lib/BackgroundJob.js` for jobs. Neither carries content: pages re-read over HTTP with their own access rules. A separate media worker process (`MEDIA_WORKER_EMBEDDED=false`) has no Socket.IO server, so its preview completions reach consoles on the next event or resync.

## Cross-cutting changes

For features spanning UI, API, persistence, and realtime updates:

1. Define durable state and transitions.
2. Add migration/repository support.
3. Implement service rules and idempotency.
4. Expose a controller/route.
5. Broadcast committed changes.
6. Update frontend state and UI.
7. Verify refresh/reconnect behavior.
