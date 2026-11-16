# Active Task: Collaborative Video Editor Showcase GIF Loop & Hover Image

## Implementation Objective

Update the "Inside the Collaborative Video Editor" showcase in `frontend/src/pages/landing/section_ScrollText.tsx` so it plays `/features/en-collab-1.gif`, `/features/en-collab-2.gif`, and `/features/en-collab-3.gif` in a continuous loop with smooth crossfade transitions by default, and smoothly transitions to `/gallery_images/new/gallery/collab.png` when hovered.

## Acceptance Criteria

- By default (not hovered), the showcase cycles through `en-collab-1.gif`, `en-collab-2.gif`, and `en-collab-3.gif` in a loop with smooth opacity crossfades.
- On hover, the showcase pauses the cycle and smoothly fades to `/gallery_images/new/gallery/collab.png`; on mouse leave, it smoothly resumes the looping GIFs.
- Existing layout, telemetry strip, and sizing remain intact without layout shift.
- No builds, type checks, lint, tests, or other verification commands run.
