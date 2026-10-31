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
- Originals fit within 1920×1080 landscape or 1080×1920 portrait without enlarging smaller videos. Rotation and non-square pixels are baked into the finalized video; its probed dimensions and URL are authoritative. Image originals are unchanged.
- Market video proxies only add the watermark at the finalized original's exact dimensions. Resolution policy must stay out of proxy creation, including when higher-resolution plans are added later.
- Market video thumbnails are separate silent, unwatermarked H.264 MP4 previews: first five seconds (or the entire shorter clip), 15 fps, fitted within 320px on the longest side without upscaling. They live under `assets/thumbnails/video-5s-320/`; image thumbnails remain WebP and audio previews remain 30-second MP3s. `BackfillMediaThumbnails.js --type=video` replaces legacy video stills without modifying originals or full watermarked proxies.
- Editor menus play these small video previews on hover/focus. Timeline filmstrips sample the short preview across the clip's width, so they are representative preview frames rather than exact full-length frame references. Old saved timeline items resolve their current generated preview through the authenticated `/api/market-assets/:id/thumbnail?mediaAssetId=...` endpoint; project documents remain unchanged.
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
