# Current Task: Modernize Video Editing Job Posts & Budget Type Filters Suite

## Objective
1. **Strictly Video Editing Focus**: All 15 posts are curated around video editing workflows on Ensemble (YouTube long-form, TikTok/Reels short-form hooks, 4K wedding films, multicam podcast assembly, velocity gaming montages, archival historical documentaries, e-commerce product ads, DaVinci Resolve color grading, SaaS motion demos, cinematic travel vlogs, brand commercial post teams, YouTube scaling teams, documentary feature crews, music video VFX duos, and cinematography course production).
2. **Individual vs. Team Separation**:
   - Outdated individual posts with `no_of_hires > 1` eliminated.
   - All 10 Individual Jobs strictly have `hiring_type = 'single'` and `no_of_hires = 1`.
   - All 5 Team Jobs have `hiring_type = 'team'`, with `no_of_hires` matching the exact sum of milestone roles (`slots_count` totaling 2 or 3) and budget percentages totaling 100%.
3. **Budget Diversity & Formatting**:
   - Open Bids (`minBudget+`, `maxBudget = null`) display with `+` benchmark indicator.
   - Milestone Pools display exact figures strictly without any `+` (e.g., `15,000`, `9,000`, `18,000`).
   - Ranged Budgets (`minBudget – maxBudget`) and Fixed Price (`minBudget = maxBudget`).
4. **Budget Type Filters**:
   - Added `Budget Type` section in `JobFilters`:
     - `Open Bid` (`[Individual]`)
     - `Ranged` (`[Individual]`)
     - `Pooled` (`[Team]`)
     - `Fixed Price` (`[Individual]`)
   - Intelligent contextual awareness:
     - Selecting `Individual` project type dims `Pooled` (`Team only`).
     - Selecting `Team` project type dims `Open Bid`, `Ranged`, and `Fixed Price` (`Individual only`).
     - Clicking any budget type directly filters jobs by their specific pricing model (`getJobBudgetType`).
5. **Clean Slate (Zero Proposals)**:
   - Cleaned all legacy test proposals, interviews, contracts, and attachments.
   - Database has exactly 15 open video editing jobs and 0 proposals, ready for realistic testing.

## Verification & Status
- [x] Database updated: 15 video editing jobs seeded (10 single, 5 team), 0 proposals, 14 milestones.
- [x] Milestone pools format without `+`.
- [x] Single-hire jobs with roadmap milestones correctly retain `Individual` badge.
- [x] Budget Type filter (`open`, `ranged`, `pooled`, `fixed`) implemented and tested.
- [x] `npm run build --prefix frontend` passes with zero errors and zero warnings.
