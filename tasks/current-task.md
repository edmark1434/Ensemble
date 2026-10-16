# Current Task: Incoming Proposals & Incoming Orders Card Layout Refinements

## Objective
1. **Job Proposals Card Refinement (`/jobs/proposals`)**:
   - Moved the `Hired` counter pill to the upper right corner of the job's thumbnail image as a sleek floating glass badge displaying `{job.hiredCount}/{job.positionsNeeded} Hired` (e.g. `0/1 Hired` or `1/1 Hired`).
   - Converted the `Proposals` counter stat box in the bottom grid to a clean neutral gray theme (`bg-gray-50 dark:bg-white/5 border-gray-200 text-gray-900 dark:text-white` with `text-gray-500` icon).
   - Card bottom stats now cleanly span a balanced 2-column layout: **Budget** (Amber) and **Proposals** (Gray).

2. **Gig Orders Card Refinement (`/gigs/orders`)**:
   - Moved both `Tiers` and `Total Orders` counter pills to the upper right corner of the service/gig thumbnail as floating glass badges:
     - `{tiers.length} Tiers` (purple icon)
     - `{ordersCount} Total` (blue icon)
   - Converted the `Pending` orders counter stat box in the bottom grid to a clean neutral gray theme (`bg-gray-50 dark:bg-white/5 border-gray-200 text-gray-900 dark:text-white` with `text-gray-500` clock icon).
   - Card bottom stats now cleanly span a balanced 2-column layout: **Starting Price** (Amber) and **Pending Orders** (Gray).

3. **Status Flow Guides**:
   - Both `/jobs/proposals/flow` and `/gigs/orders/flow` remain registered and easily accessible via the "Proposal Flow" and "Order Flow" tabs.

## Acceptance Criteria
1. Job thumbnail on `/jobs/proposals` has `{hiredCount}/{positionsNeeded} Hired` floating in its upper right corner.
2. Job card bottom stats grid contains Budget and Gray Proposals box.
3. Gig thumbnail on `/gigs/orders` has `{tiers.length} Tiers` and `{ordersCount} Total` floating in its upper right corner.
4. Gig card bottom stats grid contains Starting Price and Gray Pending box.
5. High-contrast light mode styling preserved across all cards.
6. `npm run build` succeeds with zero errors.
