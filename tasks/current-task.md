# Active Task: Profile Sidebar Merit, Ratings & Budget UI Refinements

## Implementation Objective

1. **Platform Merit Section**:
   - Reordered layout: Circular gauge on the left, Platform Merit label and status on the right.
   - Removed "Starts at 100" text.
   - Made the status text gray (`text-gray-700 dark:text-zinc-200`) and the `ShieldCheck` icon a bold, highly visible emerald green (`text-emerald-600 dark:text-emerald-400`).
2. **Ratings Section**:
   - Moved the Freelance sub-stat pill cleanly below the hero rating (`5.0 (1 review)`), giving the review count ample space without wrapping.
3. **Planned Budget Section**:
   - Removed the outer icon container on the left.
   - Integrated the animated `CreditIcon` (dotlottie) alongside the budget credits amount and in the edit header.
   - Styled the Planned Budget edit button to match the Account Badges edit button for visual consistency: an icon-only square button with matching subtle borders, neutral background, and hover rotation micro-interaction.

## Acceptance Criteria

- [x] Circle gauge on left, Platform Merit on right in [`RatingsBudgetSideSection_ProfileDisplay.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/7_profile/Displays/RatingsBudgetSideSection_ProfileDisplay.tsx).
- [x] "Starts at 100" removed.
- [x] Merit band text in gray with visible dark/emerald green `ShieldCheck` icon.
- [x] Freelance pill positioned below the hero rating.
- [x] Left icon container removed from Budget section; animated `CreditIcon` integrated.
- [x] Edit button on Planned Budget styled consistently with Account Badges edit button (`p-1.5 rounded-lg border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-white/[0.02] hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 cursor-pointer group/btn`).
- [x] Plus Jakarta Sans typography preserved across all items.
