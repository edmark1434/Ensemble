# Current Task — Fix Contract Review Submission, Status Transition, and Profile Performance Tab Display

Resolve the review bug where submitting a client/freelancer review leaves the "Review" button visible and keeps contract status as 'Done' instead of 'Completed', and ensure submitted reviews display under the user profile's Performance tab (under "As Freelancer" for reviews received when working as freelancer, and under "As a Client" for reviews received when hiring as client).

## Root Causes Identified
1. **Inverted Review Query Subqueries**:
   - In `DashboardRepositories.js` (`getDashboardTasks` and `getTaskById`) and `ContractRepositories.js` (`getContractsByUserId`), `client_rating` queried `r.account_id = client_account_id` and `freelancer_rating` queried `r.account_id = freelancer_account_id`.
   - In PostgreSQL, `ratings.account_id` is the reviewee (the account receiving the review).
   - The review submitted by the client targets the freelancer (`r.account_id = freelancer_account_id`).
   - The review submitted by the freelancer targets the client (`r.account_id = client_account_id`).
   - The inverted queries resulted in `myReview` remaining `null` on the dashboard, so the button remained visible and the status remained 'Done'.
2. **Review Recipient ID in `submitContractReview`**:
   - `submitContractReview` previously inserted `req.user.account_id` (the reviewer) into `ratings.account_id` instead of the reviewee/target account ID (`client_account_id` or `freelancer_account_id`).
   - Consequently, queries on the reviewee's profile found 0 reviews.
3. **Status Override in Frontend**:
   - In `DashboardTaskDetail.tsx` and `DashboardTaskList.tsx`, `computedStatus` actively downgraded `task.contract_status === 'Completed'` back to `'Done'` if reviews were not yet loaded.
4. **Missing Service Layer and Realtime Broadcast**:
   - `DashboardControllers.reviewContract` called repository directly without a service or realtime Socket.IO broadcast (`dashboardTaskUpdated`), preventing real-time synchronization between client and freelancer browser tabs.

## Implementation Objectives
- [x] Fix `submitContractReview` in `DashboardRepositories.js` to target the counterparty account ID, perform upsert, and update `contracts.status = 'Completed'` when both parties have reviewed.
- [x] Fix `client_rating` and `freelancer_rating` subqueries in `DashboardRepositories.js` (`getDashboardTasks`, `getTaskById`) and `ContractRepositories.js` (`getContractsByUserId`).
- [x] Fix gig review queries in `GigRepositories.js` to match `ratings.account_id = g.freelancer_account_id`.
- [x] Implement `reviewContractServices` in `DashboardServices.js` with validation, notification, and Socket.IO broadcast (`dashboardTaskUpdated` & `notification`).
- [x] Update `DashboardControllers.reviewContract` to call `reviewContractServices`.
- [x] Enhance `ProfileRepositories.getProfileReviewsByAccountId` to support affiliated accounts and proper fallback display names.
- [x] Update frontend components (`DashboardTaskDetail.tsx`, `DashboardTaskList.tsx`, `dashboard_main.tsx`, `MilestoneActivityFeed.tsx`) to respect `'Completed'` status, hide the review button once reviewed, and display review confirmation.
- [x] Verify frontend build and backend syntax checks.
