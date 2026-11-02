# Current Task: Landing Page Gallery Showcase & Hero Looping Videos

## Objective
1. Add a Gallery section (`02.1 / GALLERY`) under `What's inside.` (`Highlights`) in `frontend/src/pages/landing/section_ScrollText.tsx` displaying the Video Editor Collaboration screenshot (`/gallery_images/new/gallery/collab.png`).
2. Cycle the Hero section background video in `frontend/src/pages/landing/section_Hero.tsx` through the original video (`/clip/hero_vid.mp4`), `/gallery_images/new/vids/herovid_1.mp4`, and `/gallery_images/new/vids/herovid_2.mp4` every 4 seconds in a continuous loop.

## Acceptance Criteria
- [x] `What's inside.` section includes a `02.1 / GALLERY` showcase block with `/gallery_images/new/gallery/collab.png`.
- [x] `SectionHero` starts with `/clip/hero_vid.mp4`, transitions to `/gallery_images/new/vids/herovid_1.mp4` after 4s, then `/gallery_images/new/vids/herovid_2.mp4` after 4s, and loops back to `/clip/hero_vid.mp4`.
- [x] `cd frontend && npm run build` passes without errors.
