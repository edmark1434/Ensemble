# Architecture

## Runtime components

- The frontend is a React/Vite single-page application served separately from the API.
- `backend/Server.js` creates one HTTP server shared by Express and Socket.IO.
- The API is mounted at `/api` through `backend/routes/Api.js` and normally listens on port `4000`.
- The local frontend normally runs on port `5173`; production origins come from environment configuration.
- PostgreSQL stores relational/business data. MongoDB is used by features that need document-oriented storage. Redis supports transient/shared state.
- `backend/lib/BackgroundJob.js` starts reconciliation work after database connections initialize.
- Asset previews (images, videos, audio) run through `media_asset_jobs` after listing creation. Pending proxy/thumbnail references are nullable. The backend drains one job at a time every three seconds; set `MEDIA_WORKER_EMBEDDED=false` when running the separate `npm run media:worker` process. Listings remain drafts until previews finish, and the asset UI polls processing records for completion or failure.

## Video upload normalization

- New market video originals are normalized during upload finalization in `backend/services/FileServices.js`, before a file record is returned. Editor file and URL uploads use `video-editor/src/lib/video-upload.ts` before creating their media record.
- Video originals fit the uploader's current subscription: Free 1280×720, Premium 1920×1080, Business 3840×2160, with bounds reversed for portrait. Both sides are bounded while preserving aspect ratio and never enlarging smaller videos. Rotation and non-square pixels are baked into the finalized video; its probed dimensions and URL are authoritative. Image originals are unchanged.
- Market video proxies only add the watermark at the finalized original's exact dimensions. Resolution policy stays in upload finalization, not proxy creation. Backend `UploadPolicyServices` and editor `upload-policy` resolve the newest active, unexpired subscription from the database; client plan values are never accepted. Business has a 4K cap but no upgrade notice.
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
- The render service rejects unauthenticated requests and checks job ownership for progress and cancellation. Local output downloads use expiring signed links. Resolution/FPS limits and queue routing remain plan-based; export duration has no plan limit.
- Editor and render-server compositions cache timeline grouping and a frame-range index. Image/text/caption content is built only when its sequence is active, including transition and nested-scene content. Editor videos retain eager mounting.
- Local rendering bundles the current renderer source on startup unless `REMOTION_SERVE_URL` is configured. Lambda uses the separately deployed bundle at `REMOTION_LAMBDA_SERVE_URL`; renderer source changes require redeploying that bundle.

## Realtime behavior

Socket.IO is initialized once in `backend/lib/WebSocket.js`. Persist authoritative state before emitting. Events should contain stable IDs, timestamps, and enough normalized data for clients to update without guessing. Reconnects must recover state through an API query rather than depending solely on missed events.

## Cross-cutting changes

For features spanning UI, API, persistence, and realtime updates:

1. Define durable state and transitions.
2. Add migration/repository support.
3. Implement service rules and idempotency.
4. Expose a controller/route.
5. Broadcast committed changes.
6. Update frontend state and UI.
7. Verify refresh/reconnect behavior.
