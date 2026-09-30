# Current Task — Milestone Business Logic & In-App Notifications

Implement balanced real-world milestone business logic for Jobs and Gigs:
- Inactivity / non-response handling for milestone submissions (auto-approval after 5 days for jobs, 3 days for gigs with credit release to freelancer).
- Overdue milestone tracking with client-initiated actions (Cancel & Refund, Extend Deadline, Approve, Revision Request) rather than surprise auto-cancellation.
- In-app notifications and real-time Socket.IO alerts for both clients and freelancers across all milestone status events.

## Implementation Objective
1. **Database Schema & Migrations**:
   - Add `started_at` and `overdue_at` timestamps to `contract_milestones` to track active milestone progress and deadlines.
   - Index `(status, started_at)` and `(status, overdue_at)` for high-performance cron sweeps.
2. **Repository & Transactional Operations (`MilestoneRepositories.js`)**:
   - Lock milestones and escrow/account wallets with `FOR UPDATE`.
   - Implement `autoApproveMilestoneSubmit`: debit freelancer escrow wallet, credit freelancer account wallet, record `credit_transactions` ('Escrow Release' referencing `contract_milestones`), activate next milestone, mark contract done if complete.
   - Implement `cancelMilestoneAndRefund`: debit freelancer escrow wallet, credit client account wallet (refund), mark milestone `cancelled` and cancel contract if all non-completed milestones are cancelled.
   - Implement `extendMilestoneDeadline`: extend hours and clear overdue flags.
   - Implement `approveMilestoneSubmit` and `requestMilestoneRevision` with revision quota tracking.
3. **Business Logic & Background Crons (`MilestoneServices.js` & `BackgroundJob.js`)**:
   - Overdue Detector (runs hourly at `:00`): flags milestones past deadline as `overdue` and notifies both parties.
   - Stalled Escalator (runs hourly at `:15`): escalates overdue milestones without submission after 7 days to `stalled`.
   - Auto-Approve Resolver (runs hourly at `:30`): auto-approves submissions left under review for 5 days (job) / 3 days (gig).
   - Milestone Reminders (runs hourly at `:45`): sends 48h deadline warnings to freelancers and 2-day auto-approve warnings to clients.
   - Abandoned Marker (runs daily at 02:30): marks contracts abandoned after 30 days of inactivity.
4. **API Routes & Controllers (`Milestone.js` & `MilestoneControllers.js`)**:
   - Endpoints under `/api/contracts/:contractId/milestones`: `POST /:milestoneId/cancel`, `POST /:milestoneId/extend`, `POST /:milestoneId/approve`, `POST /:milestoneId/revision`.
5. **Contract Lifecycle Integration (`ContractRepositories.js`)**:
   - Set `started_at = NOW()` on the first milestone when a contract is accepted and becomes `active`.
6. **Frontend Contracts View (`contracts.tsx`)**:
   - Status mapping supporting `Claimed`, `In Progress`, `Under Review`, `Overdue`, `Stalled`, `Abandoned`.
   - Distinct color-coded badges for all milestone states.
   - Client action buttons (`Approve`, `Revise`, `Extend`, `Cancel`) with confirmation modal for actions.

## Acceptance Criteria
- [x] Migration created and executed (`1813200000000_171-add-milestone-deadline-tracking.js`).
- [x] `backend/repositories/MilestoneRepositories.js` handles transactions and cron queries.
- [x] `backend/services/MilestoneServices.js` implements business rules, notification dispatches, and socket emits.
- [x] `backend/controllers/MilestoneControllers.js` and `backend/routes/Milestone.js` registered in `Api.js`.
- [x] `backend/lib/BackgroundJob.js` schedules 5 recurring cron tasks with concurrency locks.
- [x] `backend/repositories/ContractRepositories.js` initializes `started_at` on contract acceptance.
- [x] `frontend/src/pages/user/contracts/contracts.tsx` includes action controls, status badges, and confirmation dialogs.
- [x] Backend syntax checks pass.
- [x] Frontend compiles cleanly with `npm run build`.
