# Current Task: Type-Aware Job Discovery Ranking Algorithm & 25 Seeded Job Posts

## Objective
Implement the **100-Point Type-Aware Job Discovery Ranking Algorithm** for the Job Market (`/jobs`) across all 3 job post types (`Individual — Open Bid`, `Individual — Ranged / Multi-Seat`, and `Team — Milestone Pool`), add the green `Rising` badge (`TrendingUp`), add the collapsible gray `"Your Job Discovery Score"` owner card, add the `"How Ranking Works"` info tab (`/jobs/info`), and seed 25 realistic job posts in PostgreSQL.

## Acceptance Criteria
- [x] `backend/repositories/JobRepositories.js` returns real `client_rating` and `client_rating_count` from `ratings`.
- [x] `frontend/src/pages/user/6_job_market/job_ranking.ts` computes the 100-point score tailored to `individual_open`, `individual_ranged`, and `team_pool`.
- [x] Green `Rising` badge (`TrendingUp` icon) appears on qualifying jobs in Grid/List cards, drawer, and full page.
- [x] Neutral gray, collapsible, closed-by-default `"Your Job Discovery Score"` card appears for job owners (`isOwnPost`).
- [x] `/jobs/info` tab (`JobPostsInfoGuide.tsx`) explains the 4 pillars and the 3 type-aware quality checklists.
- [x] 25 realistic jobs seeded via `backend/scripts/SeedJobsDataset.js`.
- [x] Frontend build passes (`npm run build`).
