# Current Task

## Objective

1. **Portfolio export attaching state**:
   - Once the portfolio clip render finishes (`status === "publishing"`), transition the portfolio export modal and navbar button to an "Attaching clip to portfolio" state (similar to the queued state) instead of remaining stuck at 100%.
2. **Portfolio clip post-render processing**:
   - Fix false duration-check failures in `makePortfolioPoster` (use video stream duration rather than container duration with AAC padding, widen the 150ms tolerance to 1000ms, and clamp portfolio frame ranges to the composition duration).
   - Validate portfolio project terms before downloading and log sanitized stage/code/message diagnostics in `PortfolioClipJob.js` instead of only `error.name`.
3. **Project thumbnail 502 failures**:
   - Fix `thumbnail-payload.ts` to compute effective project duration from timeline items, exclude missing/deleted uploads and non-HTTP(S) media sources (including inside nested scenes), and ignore orphaned or zero-length items before picking the thumbnail frame.

## Acceptance Criteria

- After a portfolio clip render reaches 100%, the modal transitions to an "Attaching clip to portfolio" view and the export button reads "Attaching to portfolio" until publishing succeeds or fails.
- `makePortfolioPoster` checks the video stream duration with a 1000ms tolerance and checks against `portfolioUseDurationSeconds` when applicable, and `PortfolioClipJob.js` logs the failing stage, error code, and sanitized error message.
- `POST /api/portfolio/[id]` clamps `firstFrame` and `endFrame` within the composition's frame count.
- `buildThumbnailJob` filters out deleted uploads, non-HTTP(S) media URLs, zero-length/orphaned items, and derives duration from timeline items when `snap.duration` is stale or 0.
