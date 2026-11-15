# Active Task: Optimistic timeline additions and local-file drag previews

- Restore canvas drops for library items and local media.
- Insert menu/upload-library media immediately; finish metadata loading by updating that item's ID against current state so concurrent additions cannot overwrite each other.
- Local timeline files use the native menu-item preview, snapping and lane placement. Canvas files use the playhead, matching canvas menu drops.
- Accepted local files insert loading clips before uploading, then resolve those same clips in their original project/scene; deleted clips are not resurrected.
- Preserve placement and edits made during loading, and retain magnetic-lane behavior.
- Text insertion must not wait for fonts to load.
- Drag previews remain plain labeled track placeholders, without media. Suppress the browser's card screenshot and floating media-card preview over the timeline.
- Use the existing upload queue, file size and batch limits, storage checks and feedback.
- Respect view-only mode and keep pending imports from inserting into a different project or scene.
- Every local-file drop opens the Uploads tab, including rejected batches.
- Canvas and timeline reuse the Uploads menu overlay for hover and validation messages.
- Canvas file handling lives outside the scaled artboard so overlay text stays at normal UI size and errors survive the empty canvas disappearing.
- No builds, type checks, lint or tests run.
- Drop hit areas and overlays are limited to the populated/empty artboard and the timeline ruler/lanes. Timeline header is excluded; playhead positioning stays relative to its original container.
