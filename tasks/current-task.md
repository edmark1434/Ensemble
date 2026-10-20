# Current Task: Modernize Video Editing Job Posts Seeding Suite

## Objective
Replace outdated seed job posts in the PostgreSQL database and frontend fallback datasets:
1. **Strictly Video Editing Focus**: All 15 posts are curated around video editing workflows on Ensemble (YouTube long-form, TikTok/Reels short-form hooks, 4K wedding films, multicam podcast assembly, velocity gaming montages, archival historical documentaries, e-commerce product ads, DaVinci Resolve color grading, SaaS motion demos, cinematic travel vlogs, brand commercial post teams, YouTube scaling teams, documentary feature crews, music video VFX duos, and cinematography course production).
2. **Individual vs. Team Separation**:
   - Outdated individual posts with `no_of_hires > 1` eliminated.
   - All 10 Individual Jobs strictly have `hiring_type = 'single'` and `no_of_hires = 1`.
   - All 5 Team Jobs have `hiring_type = 'team'`, with `no_of_hires` matching the exact sum of milestone roles (`slots_count` totaling 2 or 3) and budget percentages totaling 100%.
3. **Budget Diversity**:
   - Open Bids (`minBudget+`, `maxBudget = null`).
   - Ranged Budgets (`minBudget – maxBudget`).
   - Fixed Budgets (`minBudget = maxBudget`).
   - Team Milestone Pools.
4. **Clean Slate (Zero Proposals)**:
   - Cleaned all legacy test proposals, interviews, contracts, and attachments.
   - Database has exactly 15 open video editing jobs and 0 proposals, ready for realistic testing.
5. **Seed & Fallback Parity**:
   - `backend/lib/SeedJobs.js`: Modular seed script containing the 15 jobs definition and `seedSampleJobs`.
   - `backend/lib/Seed.js`: Imported and integrated `seedSampleJobs`.
   - `frontend/src/pages/user/6_job_market/job_datasets.tsx`: Full fallback dataset updated to match all 15 jobs with matching metadata, tags, and milestones.
   - `frontend/src/pages/user/6_job_market/job_proposals/proposals_datasets.tsx`: Proposal fallback titles updated.
   - `frontend/src/pages/user/6_job_market/job_main.tsx` & proposal pages: Safely resolve thumbnail URLs using `getImageUrl`.

## Verification & Status
- [x] Database updated: 15 video editing jobs seeded (10 single, 5 team), 0 proposals, 14 milestones.
- [x] All 10 single jobs have `no_of_hires = 1`.
- [x] All 5 team jobs have `no_of_hires = 2` or `3` matching milestone slot allocations.
- [x] `npm run build --prefix frontend` passes with zero errors and zero warnings.
