# Current task: Job Market Algorithm Enhancements & Scoring UI Optimization

## Objective

Enhance the Ensemble Job Marketplace discovery ranking algorithm with subscription visibility boosts, dual-mode scoring breakdown guide, stable skeleton feed rendering, verified user prompt flash resolution, and simplified responsive job review preview.

## Scope

- Backend: `backend/repositories/JobRepositories.js`, `backend/data/marketplace/jobs.md`
- Frontend Auth & Nav: `frontend/src/lib/global_state.ts`, `frontend/src/components/nav/user_nav.tsx`, `frontend/src/components/utility/ToastTestingWidget.tsx`
- Frontend Ranking Engine: `frontend/src/pages/user/6_job_market/job_ranking.ts`
- Marketplace Feed & Drawer: `frontend/src/pages/user/6_job_market/job_main.tsx`, `frontend/src/pages/user/6_job_market/job_components/job_lists.tsx`, `frontend/src/pages/user/6_job_market/job_components/job_viewdetails.tsx`, `frontend/src/pages/user/6_job_market/job_components/jobs_other_posts.tsx`, `frontend/src/pages/user/6_job_market/job_pages/job_full_page.tsx`, `frontend/src/pages/user/1_home/home_components/home_featured_jobs.tsx`
- Info Guide: `frontend/src/pages/user/6_job_market/job_components/JobPostsInfoGuide.tsx`
- Job Creation Review: `frontend/src/pages/user/6_job_market/job_components/job_creation_components/3_create_review.tsx`, `frontend/src/pages/user/6_job_market/job_components/job_creation_components/5_create_teamreview.tsx`

## Acceptance criteria

- Subscription visibility boost (+3.0 pts for Premium, +9.0 pts for Business) integrated into backend queries and frontend discovery algorithm.
- Alt+O dev mode overlay displays algorithm score, discovery roll key, and subscription tier boost.
- Job cards pre-sort by discovery roll before skeleton loading dismisses, preventing card layout jumping.
- Verification banner flash eliminated on page refresh for verified users via cached persistence.
- `/jobs/info` guide provides dual viewing modes (Visual Cards vs Table View) with percentage columns and origin filters.
- Job post review step provides a wider 7:5 card layout with concise, user-friendly scoring breakdowns.
- Frontend builds with 0 errors (`npm run build`).
