# Current Task — Platform-wide Button Interaction Feedback

Add a safe global fallback so clickable buttons across the platform visibly respond to hover and use the correct cursor.

## Acceptance Criteria

- [x] Enabled native buttons use the pointer cursor.
- [x] Button-like inputs use the pointer cursor.
- [x] Custom controls with role="button" use the pointer cursor.
- [x] Disabled and aria-disabled controls use the not-allowed cursor.
- [x] Pointer devices receive visible hover feedback.
- [x] Touch devices do not receive sticky hover styling.
- [x] Frontend TypeScript and production build pass.

## Implementation Notes

- Added one global fallback in frontend/src/index.css rather than modifying unrelated components individually.
- Used brightness-based hover feedback to avoid changing layout or overriding component transform animations.
- Existing component-specific hover styles remain active.

Status: Completed.

## Verification

- frontend npm run build passed (TypeScript and Vite production build).
- Scoped git diff --check passed.
