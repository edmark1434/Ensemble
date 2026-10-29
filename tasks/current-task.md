# Active Task: User-facing Platform Merit from warning points

## Implementation Objective

Show Platform Merit on user surfaces as `100 − active warning points`. Do not store merit. Keep warning-point language on the backend and staff desks.

## Acceptance Criteria

- [x] Merit is derived, not a database column. Default 100.
- [x] Profile Performance tab shows the Platform Merit ring.
- [x] Owner Record and user toasts say merit, not warning points.
- [x] Staff/admin/moderator UIs still use warning points.
- [x] `tsc --noEmit` succeeds. Vite still fails on the existing missing `canvas-confetti` import in `Profile.tsx`.
- [ ] Profile merit ring verified in the browser (app was not running).
