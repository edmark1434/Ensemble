# Current Task: Bell notification styling

## Objective
Make bell dropdown items match the live toast style (coloured type label, bold actor, avatar/icon) and share one notification type map between the bell and `/notifications`.

## Acceptance Criteria
- Bell items show a readable label instead of the raw `reference_prefix`, and no longer show `reference_table`.
- Follow notifications show the follower's name, "started following you", and their avatar.
- Every `reference_prefix` created by the backend has a label and icon in `frontend/src/lib/notificationTypes.tsx`.
- `cd frontend && npm run build` passes.
