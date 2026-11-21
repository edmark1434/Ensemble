# Current Task

## Objective

1. **Canvas media actions & Canva-style Replace**:
   - Convert the canvas "Remove watermarks" button to icon-only with a tooltip for its label.
   - Add a **Replace** button beside it for selected canvas images and videos.
   - Clicking **Replace** opens a Canva-style replace menu showing only **Videos**, **Images**, and **Uploads** (excluding audio) with a **Replace** header at the top; clicking any image/video replaces the target item's media source while preserving layout, sizing, position, transform, styling, animations, and timeline slot (regardless of new media aspect ratio).
2. **Timeline drag-to-replace**:
   - Dragging a video/image from the menu over an existing timeline video/image highlights that timeline item with `[icon] Replace` and replaces its media on drop while preserving layout/sizing.
3. **Thumbnail generation timeout**:
   - Fix `TimeoutError` in `thumbnail-service.ts` by filtering thumbnail payloads to items relevant to the target frame (skipping audio, hidden, and `pending-upload:` items), increasing the thumbnail fetch timeout, and aborting server work when a thumbnail request disconnects.
4. **Pending export check**:
   - Treat an export as active/blocking only while `queued` or `in-progress` (not after it has already `completed`), rather than blocking until the download modal is closed.

## Acceptance Criteria

- Selected watermarked canvas media shows an icon-only button with a tooltip ("Remove watermarks" or "This asset was taken down") alongside the **Replace** button; non-watermarked selected images/videos also show **Replace**.
- Clicking **Replace** opens the sidebar in Replace mode with only Videos, Images, and Uploads (no Audio tab) and a "Replace" header + close button; clicking any image/video (stock, marketplace, bundle, collection, or upload) replaces the item in place without changing its canvas box dimensions/position/transform.
- Dragging an image/video from the menu onto a timeline image/video shows an overlay with icon + "Replace" on that timeline item and replaces it on drop without adding a duplicate clip.
- Thumbnail generation no longer processes off-frame/audio/pending items or prematurely times out at 60s.
- Starting a new export or refreshing after an export succeeds is not blocked with a pending-export 409 just because the previous download modal wasn't closed.
