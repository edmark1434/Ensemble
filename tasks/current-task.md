# Current Task: Full-Image Card Front & Single Animated Grid Background on /landing/AboutUs

## Objective
Refine `/landing/AboutUs` based on user feedback:
1. **Front of Card as Pure Image Only**: The front face of each flip card should be 100% the portrait photo (`img`), filling the entire card with clean rounded borders, no bottom text/pills crowding it.
2. **Eliminate Duplicate Grid Background**: Remove the duplicate CSS `linear-gradient` grid background so only the single animated `ShapeGrid` is displayed with crisp, visible grid lines.
3. **Back Face Completeness**: When flipped, the back face displays the member's Name, Role (`Dev Ops | Project Manager`, `UI/UX | Jobs & Marketplace`, `Collaborative Video Editing`, `Deployment, Admin and Mods`), Focus, Biography, Skills, Universal Socials, Deliverables, and a clean return action.
4. **Verification**: Run `cd frontend && npm run build` and ensure clean compilation.

## Acceptance Criteria
- [x] Front face of all 4 cards displays only the full-bleed member image with smooth hover effects.
- [x] Remove duplicate CSS grid lines; ensure only 1 clean animated `ShapeGrid` background is rendered.
- [x] Back face displays full member details, roles, bios, and links with stop-propagation.
- [x] Pass `cd frontend && npm run build` with 0 errors.
