# Current Task: Gig Edit Page Overhaul, Add-ons Persistence & 13-Factor Service Algorithm

## Objective
1. **Fix Missing Add-ons on Gig Edit (`/gigs/edit/:id`)**: Load `addOns` on the edit page, pass them into `CreateTiers` and `CreateReview`, and persist updated add-ons in `updateGigController` and `updateGigRepository` (`PUT /api/gigs/:id`).
2. **Wide Layout & Stepper Navigation on Gig Edit**: Match the `max-w-6xl 2xl:max-w-7xl` full-width layout and 6-step wizard of `gig_create_page.tsx` with clickable stepper navigation across all 6 steps (`maxReachedStep={6}`, `hasReachedReview={true}`, `onStepClick`).
3. **Free Service Updates (0 Credits)**: Ensure editing an existing service does not require re-paying the 50 Credits creation fee (`isEditMode` in `0_gig_identity.tsx` and `6_create_review.tsx`).
4. **Apply 13-Factor Discovery Algorithm to Gigs (`gig_ranking.ts`, Gig Cards/Details, and `/gigs/info`)**: Align the Gig ranking breakdown and `/gigs/info` table view with `/jobs/info` (`Trust (35)`, `Freshness (25)`, `Package & Media (25)`, `Open Slots (15)`, and `Subscription Boost (+0..9)`).

## Acceptance Criteria
- [x] `backend/controllers/GigControllers.js` and `backend/repositories/GigRepositories.js` persist `addOns` on `PUT /api/gigs/:id`.
- [x] `gig_edit_page.tsx` uses `max-w-6xl 2xl:max-w-7xl`, loads `addOns`, enables clicking all 6 stepper tabs, and saves without charging 50 Credits.
- [x] `gig_ranking.ts`, `GigViewDetails.tsx`, `GigRichText.tsx`, `gig_lists.tsx`, and `GigServicesInfoGuide.tsx` (`/gigs/info`) implement the 13-factor 100-point + Subscription Boost algorithm and clean table layout.
- [x] Frontend build (`npm --prefix frontend run build`) passes with 0 errors.
