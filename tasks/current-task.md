# Current Task — Protect Guest Forum Creation Actions

Ensure guest forum creation entry points use the shared login/signup prompt without redirecting or opening authenticated creation modals.

## Acceptance Criteria

- [x] Guest New Discussion opens the shared login/signup modal without a toast or redirect.
- [x] Guest Create a Group opens the shared login/signup modal without a toast or redirect.
- [x] Empty-state Create Discussion actions use the same guarded behavior.
- [x] New Discussion and Create Group modals cannot render for guests.
- [x] Authenticated creation behavior remains unchanged.
- [x] Frontend type/build verification passes.

Status: Completed September 1, 2026.

## Implementation Notes

The main Forums creation action and empty-state discussion actions now share an authentication-aware handler. Guests receive the existing login/signup modal and remain on Forums, while signed-in users continue opening the relevant creation modal. Both creation modal open props include a defensive authenticated-state condition.

## Verification

- npm run build passed (tsc --noEmit and Vite production build).
- Existing dynamic-import and large-chunk build warnings remain unchanged.
- Scoped git diff check completed with only line-ending notices.