# Current Task — Multi-Milestone Partial Completion & Inactivity Abandonment Plan

Implement production-ready partial milestone completion and abandonment lifecycle for Jobs and Gigs (Upwork/Fiverr benchmark):
- Preserve Milestone 1 payments to freelancer (already approved, irrevocable).
- Enable 1-click escrow refund for overdue/stalled/abandoned Milestone 2 directly to client account wallet.
- Automated abandonment cron refund after inactivity threshold.
- Fix contract visibility in `contracts.tsx` for cancelled/partially-completed contracts.
- Ensure terminal contract status reflects partial completion (`Closed` with partial metrics) instead of vanishing.

## Implementation Objectives
1. **Backend Automation & Repositories (`MilestoneRepositories.js` & `MilestoneServices.js`)**:
   - Enhance `cancelMilestoneAndRefund` to check if $\ge 1$ milestone was already completed: set contract status to `Closed` (Partial) instead of `Cancelled`.
   - Update `reconcileAbandonedMilestonesServices` to trigger automatic escrow refund to the client if a milestone is abandoned after threshold.
2. **Frontend Contract History & Tab Visibility (`contracts.tsx`)**:
   - Fix `validStatuses` to include `Cancelled` and ensure cancelled/closed contracts render under the "Archived" tab.
   - Display financial and deliverable breakdown (e.g., "1 of 2 Milestones Paid (500 CR) • 1 Refunded (500 CR)").
3. **Dashboard Activity Feed Alerting (`MilestoneActivityFeed.tsx`)**:
   - Provide client quick-action banners when viewing an overdue or stalled milestone.
4. **Verification**:
   - Frontend `npm run build` verification.
   - Flow and transaction integrity verification.

- [x] Automated refund occurs on milestone abandonment.
- [x] Dynamic timeline scaling: Gigs and short deadlines (<= 72h) scale to 2-day stalled and 4-day abandonment; Jobs scale to 5-day stalled and 10-day abandonment.
- [x] Deadlines <= 48h receive 50% midpoint warnings instead of premature reminders.
- [x] Direct dispute and reporting shortcuts added to contract agreement modal and dashboard activity banner.
- [x] Dispute form preselects contract via URL query param and allows disputing active, closed, or cancelled contracts.
- [x] Contracts with 1 completed milestone and 1 cancelled milestone close as `Closed` with partial completion indicator.
- [x] Cancelled and closed contracts remain visible under the "Archived" contracts tab.
- [x] Freelancer keeps Milestone 1 earnings; Client receives 100% refund for unsubmitted Milestone 2.
- [x] Build passes cleanly with zero errors.
