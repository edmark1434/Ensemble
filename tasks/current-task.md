# Active Task: Project Completion Celebration, Double-Blind Reviews & Workspace Archival Retention

## Implementation Objective

1. **Real-Time Project Completion & Confetti Modal**
   - Emit Socket.IO event `projectCompleted` upon final milestone approval to `team_{teamId}` and participants.
   - Pop `ProjectCompletionModal` with celebratory confetti on both Client and Freelancer screens in real-time.
   - Modal contains "Rate & Review Now" (opens existing `RateReviewModal`) and "Later" buttons.

2. **Double-Blind Review Protection & Post-Rating Waiting State**
   - Require ratings from both parties before the contract transitions to `Completed`.
   - Mask counterparty's star rating and written feedback until both parties have submitted.
   - When one party has submitted their review, show a dedicated waiting banner indicating review completed, counterparty pending, with a live 24-hour countdown timer.

3. **Approach B: Workspace Lock & Persistent Gate**
   - If user dismisses the completion modal with "Later", affix a persistent Action Required banner to the workspace.
   - Restrict edits to read-only until the rating is submitted.

4. **Active to Archived Workspace Transition**
   - Set `is_archived = true` and `archived_at = NOW()` once the project closeout is finalized.
   - Display clean `Archived (Read Only)` badge in the workspace header.

5. **30-Day Auto-Deletion Retention Worker**
   - Background job to purge ephemeral tasks and temporary timeline scratchpads after 30 days.
   - Permanently retain contracts, financial ledgers, escrow records, and ratings.

## Acceptance Criteria

- [x] Real-time `projectCompleted` Socket.IO broadcast on final milestone approval.
- [x] Confetti modal launches simultaneously on client and freelancer screens.
- [x] Direct seamless hookup to existing `RateReviewModal`.
- [x] Double-blind review masking (reviews revealed only when both submitted).
- [x] Persistent gate banner if review is postponed.
- [x] Workspace transitions to `Archived` upon completion.
- [x] Workspace card thumbnail upper-left overlay badge with sleek dark glass styling and live 24h countdown timer.
- [x] Workspace card status badges updated to: `Active`, `Rate & Review`, `Archived`.
- [x] Workspaces tabs structured as: `All Workspaces | Active | Rate & Review | Archived | Workspace Info`.
- [x] Dedicated `WorkspaceInfoTab` with clean monochromatic tables documenting lifecycles, double-blind review protocols, retention policies, and roles.
- [x] Standardized "Action Required: Rate & Review" persistent banner to neutral zinc card styling matching "Your Review Submitted".
- [x] 30-day retention cleanup job implementation (`WorkspaceRetentionJob.js` registered in `BackgroundJob.js`).
- [x] Clean build verification (`npm --prefix frontend run build`).
