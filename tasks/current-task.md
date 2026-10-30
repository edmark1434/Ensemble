# Active Task: Reduce Marketplace Image Startup Latency

## Implementation Objective

Remove redundant authorization requests and unnecessary image downloads from editor startup. Verify licenses in a batch, return authorized image URLs with that response, then download and decode each visible image independently while keeping the canvas visible and usable.

## Acceptance Criteria

- [x] Licensed images normally use the batch response's storage URL without another per-image authorization hop.
- [x] Media components consume batch license state instead of repeating license requests.
- [x] Already-licensed assets do not wait for unrelated first-use free-license claims.
- [x] Only mounted image layers initiate image downloads; refreshed signed URLs reuse prepared image bytes.
- [x] Canvas stays mounted, unknown licenses never flash watermarks, and each image appears fully decoded.
- [x] Videos/audio stream independently; ordinary media and server-rendered exports retain existing behavior.
- [x] Server checks session, active project membership, active project license and linked image files before signing URLs; signed URLs remain transient and short-lived.
- [x] Editor typecheck, 20 focused playback/authorization/cache regressions, and frontend production build pass. Frontend build retains existing chunk-size/dynamic-import warnings.
- Live browser timing against the user's project remains unmeasured; Server-Timing now separates license database work from URL signing.
