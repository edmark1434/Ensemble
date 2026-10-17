# Current Task: Landing Page Header & Hero Section Redesign (TechText Bleed, Theme Styling & Version Relocation)

## Objective
1. **Landing Page Header Logo Simplification**:
   - In `nav_Landing.tsx`, removed the text "Ensemble" so only the circular brand icon (`/ensemble_lg.svg`) remains on the header.
   - Sized icon appropriately (28px) with hover scale transition and retained soft-click sound and navigation on click.
2. **Hero Section Brand Emphasis & Decluttering**:
   - Rearranged layout: TrueFocus pill badge as an elegant eyebrow kicker at the top (`COLLABORATIVE VIDEO EDITING | & CREATIVE MARKETPLACE`).
   - Dynamic intent tagline ("Work at the speed of your ambition", etc.) styled as a complementary, legible sub-headline (`clamp(24px, 3vw, 36px)`).
3. **Interactive TechText Brand Title & Full Drag Bleed**:
   - Integrated `@react-bits/TechText` in `frontend/src/components/ui/TechText.tsx`.
   - Applied `TechText` directly to **`Ensemble`** with responsive sizing and full container width.
   - Size/displacement labels, blueprint dashed frames, bounding boxes, corner squares, and specks are **pure white in dark mode** (`#ffffff`) and **pure black in light mode** (`#000000`).
   - Added expanded canvas bleed margins (`bleed={{ top: 350, bottom: 650, left: 250, right: 900 }}`) with `pointer-events: none` on the expanded canvas and global window drag tracking.
   - Letters can be dragged far outside the container bounds (up, down, left, right across the screen) and stay completely visible without clipping.
4. **App Version Display Below Popular Services Tags**:
   - Moved `APP_VERSION` from `@/version.tsx` (`V1.5.21 | A`) to the area directly below the Popular Services / tags section.
   - Rendered as small, uncontained, clean monospace text without any box or container.

## Acceptance Criteria
- [x] Header on landing page displays only the circular Ensemble logo icon (no text).
- [x] Eyebrow pill badge positioned cleanly at the top of the content stack.
- [x] Created `TechText.tsx` in `frontend/src/components/ui/TechText.tsx`.
- [x] Size and bounding box accent color is white in darkmode and black in lightmode (no blue).
- [x] Expanded bleed rendering allows letters to be dragged far away/outside the bounds while remaining completely visible.
- [x] Underlying buttons, inputs, and controls remain fully interactive and non-blocked.
- [x] Small version text (`APP_VERSION`) displayed below the Popular Services tags with no container/box.
- [x] `cd frontend && npm run build` compiles cleanly with zero TypeScript or Vite errors.
