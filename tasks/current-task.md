# Current Task: Animated Credits Pill Feedback (Add / Deduct Animation with Page Reload Persistence)

## Objective
Implement dynamic animated feedback on the header credit pill badge whenever credits are added or deducted, ensuring the animation works both in live real-time state and across full page reloads:
1. **Live Real-Time Animation**:
   - Updates to global wallet state (`user.wallet.balance_credits`) instantly trigger floating delta badges, pill glow/bounce, coin spin/recoil, and smooth rolling counter.
2. **Page Reload Persistence**:
   - When credits are injected via Developer Mode (or after any external gateway/reload), the delta is preserved in `sessionStorage`.
   - On page reload, the header detects the pending delta, initializes the display at the pre-transaction amount, and smoothly plays the animation (floating badge + rolling ticker + glow) as the page loads.
3. **Developer Mode Widget Update**:
   - Updated `DevModeWidget.tsx` to immediately update global user state for instant live animation, save to `sessionStorage` for reload persistence, and close cleanly without forcing a slow, jarring page reload.

## Acceptance Criteria
- [x] Credit additions (`+X`) and deductions (`-X`) trigger floating badges with coin icons.
- [x] Rolling counter smoothly interpolates balance changes over 650–750ms.
- [x] Coin icon spins 360° on addition and recoils on deduction.
- [x] Animation plays even across a full browser reload via `sessionStorage` delta detection.
- [x] DevModeWidget (`Alt+I`) animates instantly in real time without requiring a manual refresh.
- [x] Verified `npm --prefix frontend run build` completes with 0 errors.
