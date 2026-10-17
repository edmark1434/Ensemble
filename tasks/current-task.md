# Current Task: Setup Flow Card Sizing, Icon Removal, & Active Account Display

## Objective
Polish the setup wizard layout across all 3 steps:
1. **Identical Container Dimensions**:
   - Fixed container footprint for all 3 steps (`width: 100%; max-width: 620px; min-height: 540px;`).
   - `display: flex; flex-direction: column; flex: 1; height: 100%;` inside `.animated-content`.
   - Anchored footer action buttons (`marginTop: auto; paddingTop: 24px;`) across Step 1, Step 2, and Step 3 so the button row remains rock-solid in place with zero jumping or layout shift.
   - `overflow-x: hidden;` on `.setup-card` to prevent horizontal slide overflow without clipping vertical dropdown popovers.
2. **Icon Removal**:
   - Removed the `(?)` HelpCircle icon container above "About you" (Substep 1) and "Platform purpose" (Substep 2) in `04_Survey.tsx`.
3. **Active Account & Email Display**:
   - Added active account indicator badge in `SetupLayout.tsx`:
     - Displays avatar initial circle.
     - Displays account name / username (`user?.username || user?.displayName`).
     - Displays active account email (`user?.email || user?.email_address || signUpData?.email`).
     - Live emerald status indicator (`● Setting up`).
   - Rendered in both the desktop vertical sidebar and mobile header.

## Acceptance Criteria
- [x] Containers for Step 1 (Avatar), Step 2 (About You), and Step 3 (Platform Purpose) have identical width and height (`min-height: 540px`, `max-width: 620px`).
- [x] Footer action buttons (`Back`, `Next`, `Continue`, `Complete Setup`) are vertically anchored at the same baseline.
- [x] HelpCircle icon above "About you" and "Platform purpose" removed.
- [x] Active account name and email displayed in desktop sidebar and mobile header.
- [x] `cd frontend && npm run build` verified with 0 errors.
- [x] Visual verification via headless screenshots for dark and mobile views.
