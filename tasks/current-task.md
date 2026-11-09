# Current Task: SwipeToast with Bottom Fuse Timer & Notification Click Navigation

## Objectives
1. Adapt `@react-bits/SwipeToast-JS-TW` (`SwipeToast`) with:
   - Bottom burning fuse timer (`scaleX(1) -> scaleX(0)` that pauses on hover/drag/blur).
   - Horizontal **swipe-right** (`dx > 0`) to dismiss immediately (with rubberband resistance when dragging left).
   - No Undo / action button.
   - Upper-right placement where new toasts appear at the top and push older toasts downward.
2. Apply `SwipeToast` to both real-time notification toasts (`user_header.tsx`, `AccountStanding.tsx`) and general app toasts (`showSuccessToast`, `showErrorToast`, `showCustomToast` in `toast.ts`).
3. Fix clicking notifications in the floating Notifications popup (`UserNotificationModal`) and Full View (`notifications_page.tsx`) so clicking a notification row (especially `NEW FOLLOWER` notifications) reliably navigates to the person's profile (`/profile/${notification.reference_id}`) without being swallowed by `SwipeRow` pointer capture or blocked by the mark-as-read request.

## Acceptance Criteria
- [x] `SwipeRow` only calls `setPointerCapture` after crossing the drag hysteresis (`HYST = 8px`) in `onPointerMove`, allowing normal clicks on child notification cards to fire reliably.
- [x] `UserNotificationModal` and `notifications_page.tsx` mark notifications as read optimistically without blocking navigation if the `PATCH` request fails, and resolve `follow` notifications to `/profile/${notification.reference_id}`.
- [x] `SwipeToast` component created in `frontend/src/components/ui/SwipeToast.tsx` with bottom burning fuse timer and swipe-right dismissal.
- [x] Applied `SwipeToast` to `toast.ts` (`showSuccessToast`, `showErrorToast`, `showCustomToast`), `user_header.tsx` notification toasts, and `AccountStanding.tsx` warning toasts, positioned at the upper-right (`top: 16, right: 20`).
- [x] `cd frontend && npm run build` passes with zero errors.
