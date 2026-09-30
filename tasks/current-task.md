# Current Task — Contract-Centric Deadlines, Escrow Partial Refunds & Submission Dispute Protection

Transition to a contract-centric deadline and milestone escrow model: dynamic division of job/gig delivery timeframes across milestones, pausing overdue countdowns while submissions are under review, buffering contract deadlines on delayed reviews, contract cancellation with partial escrow refunds (completed milestones retained by freelancer, unfinished milestones refunded to client), and robust protections against fraudulent submissions.

## Implementation Objectives
1. **Contract-Centric Overdue & Delivery Timer**:
   - `getActiveMilestonesNowOverdue`: Checks `NOW() > COALESCE(c.deadline_at, cm.deadline_at)` and explicitly pauses overdue checks when a submission is under review (`NOT EXISTS (SELECT 1 FROM milestone_submits WHERE status = 'under_review')`).
   - Late review compensation: When activating subsequent milestones in `autoApproveMilestoneSubmit` and `approveMilestoneSubmit`, buffers `contracts.deadline_at = GREATEST(deadline_at, NOW() + (next_milestone_deadline * 1 hour))` so client review delays never compromise subsequent milestones.
2. **Contract-Level Deadline Extension**:
   - Migration `1821300000000_173-add-deadline-at-to-contracts.js` applied.
   - `extendContractDeadline` extends `contracts.deadline_at` and pushes active/overdue milestones together.
   - `POST /api/contracts/:contractId/extend` exposed and integrated into client contract modal.
3. **Contract Cancellation & Partial Escrow Refund**:
   - `cancelContractAndRefundUnfinishedMilestones` repository method added:
     - Retains earned credits for completed milestones in the freelancer's wallet.
     - Sums uncompleted milestone credits in escrow and refunds 100% back to the client's wallet.
     - Marks uncompleted milestones as `cancelled` and sets contract status to `Closed` (if partially completed) or `Cancelled` (if 0 completed).
   - `cancelContractService` and `cancelContractController` mounted on `POST /api/contracts/:contractId/cancel`.
   - Client modal in `contracts.tsx` provides "Cancel Contract" with real-time financial breakdown (completed credits kept vs unfinished escrow refunded).
4. **Milestone Submission Dispute & Fraud Protection**:
   - "Dispute This Submission" integrated across `ClientReviewPanel.tsx`, `MilestoneActivityFeed.tsx`, and `contracts.tsx`.
   - `DisputeFormPage.tsx` accepts contested milestone ID, displays milestone details banner, and preselects `"Milestone Submission Conflict"` reason.
5. **Milestone Client Chat & In-Card Deliverable Review Controls**:
   - Backend `CLIENT_STATUSES` updated to support `client_message` alongside `approval` and `revision_request`.
   - `submitMilestoneServices` and `reviewMilestoneServices` permit continuous chatting and progress updates even while a deliverable is `submitted_for_review` without resetting review state.
   - Review controls (Policy, Ask to Revise, Approve Milestone, Buy Revision, Dispute) are placed **inside the submitted review card** on the `Submissions for Review` tab, with compact, well-proportioned buttons and text.
   - In the `Submissions for Review` tab, each deliverable card includes an expandable dropdown displaying the client's review request/feedback, remarks, and attached files.
   - The bottom interaction panel is dedicated to a clean, compact milestone chat composer for both clients and freelancers, allowing immediate follow-ups and continuous discussion without blocking either user.
6. **Verification**:
   - All backend syntax checks (`node --check`) pass with 0 errors.
   - Frontend production build (`npm run build`) succeeds cleanly with 0 errors.

- [x] Contract deadline governs overall project overdue status; countdown pauses during milestone review.
- [x] Client review delay buffers subsequent milestone deadlines upon approval.
- [x] Contract-level deadline extension shifts contract and active milestone together.
- [x] Whole contract cancellation with partial refund implemented (`POST /api/contracts/:contractId/cancel`).
- [x] Completed milestones are retained by freelancer; unfinished milestones are refunded to client.
- [x] Dispute shortcuts available on all submission review touchpoints to protect against bad submissions.
- [x] Review controls are positioned compactly inside the submitted review card on the Submissions tab.
- [x] In-card expandable dropdown displays client review request, revision feedback, and attached files.
- [x] Both freelancer and client can chat in the milestone chat at all times (before, during, and after review).
- [x] All backend syntax checks and frontend builds pass cleanly.
