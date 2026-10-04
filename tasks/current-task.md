# Current Task: Discovery Page Redesign

## Objective
Redesign `/discovery` so clients are hooked by freelancers matched to their recent open job posts.

## Acceptance Criteria
- "Talent matched for you" section ranks freelancers by overlap between their profile skills and the client's open job `tags`.
- Client can switch between "All my open jobs" and each individual recent job (up to 5).
- Each match card shows a match % ring, matched skills (green), rating, and follow/message actions.
- Empty state prompts posting a job when the client has no open jobs with skills.
- Explore section: grid cards, search, role filters, Best match / Top rated / Following sorts, matched skills highlighted.
- No gradients; existing theme preserved. `npx tsc --noEmit` passes.
