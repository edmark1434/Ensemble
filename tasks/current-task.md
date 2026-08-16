# Current Task

## Objective

Fix the completed onboarding flow so a user who successfully finishes the final survey is sent to `/home` and is not redirected back to `/setup/personal-details`.

## Acceptance Criteria

- Intermediate onboarding steps remain in Redis/server-side draft state.
- Permanent personal details, avatar, and survey writes occur only through the successful final onboarding transaction.
- A successful `/api/onboarding/complete` response immediately clears the frontend onboarding route gate.
- Final navigation replaces the setup route with `/home` without looping back to step one.
- Reloading after completion uses the durable database completion state returned by `/api/onboarding/state`.
- A temporary onboarding-state request failure does not falsely redirect a user to step one.
- The Home page does not run a second legacy onboarding redirect check.

## Implementation Notes

- Confirmed `persistCompletedOnboarding` performs the permanent writes and `completed_onboarding = 'completed'` update in one PostgreSQL transaction.
- Added a small frontend onboarding-completion event/marker so `RouteMiddleware` cannot reuse its pre-completion cached path after the final request succeeds.
- Made local avatar-draft deletion best-effort after durable completion, preventing cleanup failure from presenting a false onboarding failure.
- Removed the obsolete `/api/users/session` onboarding redirect effect from the Home page; `RouteMiddleware` and `/api/onboarding/state` are now the authoritative redirect flow.
- Changed onboarding-state verification failures to render a stable retry message instead of assuming the account is incomplete.

## Verification

- `npx.cmd eslint src/lib/onboardingEvents.ts src/lib/RouteMiddleware.ts src/pages/setup_account/04_Survey.tsx src/pages/user/1_home/Home.tsx` — passed with three pre-existing RouteMiddleware hook dependency warnings and no errors.
- `npm.cmd run build` — passed (`tsc --noEmit` and Vite production build).

## Final Status

COMPLETED
