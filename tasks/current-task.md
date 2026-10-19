# Current Task: Fix Post-Login Landing Page Redirect Flicker

## Objective
1. Eliminate the awkward redirect to the landing page (`'/'`) after login.
2. Provide seamless, direct navigation to `/setup/upload-image` (or current onboarding step) if onboarding is incomplete, or to `/home` (or `redirectUrl`) if complete.
3. Enhance backend login, signup, and session endpoints to provide onboarding state directly so the client resolves the destination with zero extra latency.
4. Update `RouteMiddleware` so that authenticated users on public routes never flash the landing page while resolving their destination.

## Acceptance criteria
- [x] Backend `/api/users/login`, `/api/users/signup`, and `/api/users/me` return user `onboarding` status (`{ completed, path }`).
- [x] `Loginpage.tsx` directly resolves destination (`onboarding.path`, `/home`, or `redirectUrl`) and navigates immediately with `{ replace: true }`, never defaulting to `'/'`.
- [x] `Oauth.tsx` broadcasts onboarding completion/step changes upon Google sign-in.
- [x] `RouteMiddleware.ts` seeds onboarding gate immediately from `user.onboarding` and displays `RouteLoadingShell` instead of `<LandingPage />` if a signed-in user hits a public route while redirecting.
- [x] Frontend build succeeds without errors (`cd frontend && npm run build`).
