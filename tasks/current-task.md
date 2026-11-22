# Current Task

## Objective

1. **Portfolio export attaching state**:
   - Once the portfolio clip render finishes (`status === "publishing"`), transition the portfolio export modal and navbar button to an "Attaching clip to portfolio" state instead of staying at 100%.
2. **Portfolio clip post-render processing & S3-to-S3 fast path**:
   - Skip downloading/re-uploading the rendered MP4 through the backend when the render output is already on S3: use server-side `CopyObjectCommand` into `AWS_BUCKET_NAME` and probe/extract the poster directly via a short-lived presigned URL, with automatic fallback to stream transfer if direct copy or remote probing isn't available.
   - Fix false duration-check failures in `makePortfolioPoster` (use video stream duration, widen tolerance to 1000ms, clamp portfolio frame ranges) and log sanitized stage/code/message diagnostics in `PortfolioClipJob.js`.
   - Reduce portfolio worker polling interval from 5s/3s to 2s/2s.
3. **Frozen Yjs `transitionInfo` crash**:
   - Fix `readStateFromDoc` in `ydoc-schema.ts` to clone `transitionInfo` instead of mutating `info.transition` in place, and log unexpected errors in `PortfolioPage`.
4. **Project thumbnail 502 failures**:
   - Fix `thumbnail-payload.ts` to derive duration from timeline items and exclude missing/deleted uploads, non-HTTP(S) media URLs, and orphaned/zero-length items.

## Acceptance Criteria

- After a portfolio render completes, the modal shows "Attaching clip to portfolio" and the button shows "Attaching to portfolio".
- When the render output URL is on S3 and readable by the backend's AWS credentials, `PortfolioClipJob` copies the MP4 server-side inside S3 and probes/extracts the poster via presigned URL without downloading the full video, falling back cleanly otherwise.
- Opening `/portfolio/[id]` on projects with transitions no longer crashes with `Cannot assign to read only property 'transition'`.
- `buildThumbnailJob` skips missing uploads, non-HTTP(S) sources, and zero-length/orphaned items.
