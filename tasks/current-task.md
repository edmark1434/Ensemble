# Active Task: Seamless Card Layout across Jobs, Gigs, Home & Profile

## Implementation Objective

Apply the seamless edge-to-edge thumbnail design across all Job and Gig card views and listings in the application:

1. **Job Market Cards ([`job_lists.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_components/job_lists.tsx))**:
   - Grid View: Full-bleed top thumbnail (`h-44 sm:h-48 border-b`), body in `p-4 flex-1 flex flex-col justify-between`.
   - List View: Full-bleed left thumbnail (`h-auto min-h-[180px] w-56 lg:w-60 border-r self-stretch`), body in `flex-1 p-5`.
   - Skeletons: Updated to mirror the seamless structure.

2. **Gig Market Cards ([`gig_lists.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/7_gigs/gig_components/gig_lists.tsx))**:
   - Grid View: Full-bleed top thumbnail (`h-44 sm:h-48 border-b`), body in `p-4 flex-1 flex flex-col justify-between`.
   - List View: Full-bleed left thumbnail (`h-auto min-h-[180px] w-56 lg:w-60 border-r self-stretch`), body in `flex-1 p-5`.
   - Skeletons: Updated to mirror the seamless structure.

3. **Home Page Featured Sections**:
   - **Latest Job Posts** ([`home_featured_jobs.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/1_home/home_components/home_featured_jobs.tsx)):
     - Full-bleed top thumbnail (`h-44 sm:h-48 border-b`), outer `overflow-hidden`, body in `p-4 flex-1 flex flex-col justify-between`.
   - **Top Services** ([`home_featured_gigs.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/1_home/home_components/home_featured_gigs.tsx)):
     - Full-bleed top thumbnail (`h-44 sm:h-48 border-b`), outer `overflow-hidden`, body in `p-4 flex-1 flex flex-col justify-between`.

4. **Recommendation Sections**:
   - **Other Job Posts You May Like** ([`jobs_other_posts.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/6_job_market/job_components/jobs_other_posts.tsx)):
     - Seamless card and skeleton layout (`h-44 sm:h-48 border-b`), body in `p-4 flex-1 flex flex-col justify-between`.
   - **Other Services You May Like** ([`gigs_other_services.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/7_gigs/gig_components/gigs_other_services.tsx)):
     - Seamless card and skeleton layout (`h-44 sm:h-48 border-b`), body in `p-4 flex-1 flex flex-col justify-between`.

5. **Profile Tabs**:
   - **Services Tab** ([`Profile_Services.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/7_profile/Displays/Body/Profile_Services.tsx)):
     - Seamless list card layout (`overflow-hidden rounded-2xl`), left thumbnail flush with card edges (`h-44 sm:h-auto sm:min-h-[160px] sm:w-56 border-b sm:border-b-0 sm:border-r self-stretch`), content in `p-4 sm:p-5 flex-1 flex flex-col justify-between min-w-0`.
     - Skeleton updated to match.
   - **Job Posts Tab** ([`Profile_JobPosts.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/7_profile/Displays/Body/Profile_JobPosts.tsx)):
     - Seamless list card layout (`overflow-hidden rounded-2xl`), left thumbnail flush with card edges (`h-44 sm:h-auto sm:min-h-[160px] sm:w-56 border-b sm:border-b-0 sm:border-r self-stretch`), content in `p-4 sm:p-5 flex-1 flex flex-col justify-between min-w-0`.
     - Skeleton updated to match.

## Acceptance Criteria

- [x] Home Page (Latest Job Posts & Top Services) cards have seamless full-bleed thumbnails.
- [x] Gig / Job details recommendations (Other Services & Other Job Posts You May Like) cards and skeletons have seamless thumbnails.
- [x] Profile (Services & Job Posts tabs) cards and skeletons have seamless left-edge thumbnails without outer border gaps.
- [x] All overlay buttons (saves, bookmarks, algos, ratings, status, tags) remain fully functional and intact.
- [x] No verification commands run per user preference.
