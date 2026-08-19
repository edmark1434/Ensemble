# Accounts, Profiles, Settings, and Verification

Primary routes: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/settings`, `/profile`, `/verification`

Route source: `frontend/src/App.tsx`

Related sources:

- `frontend/src/pages/auth/Loginpage.tsx`
- `frontend/src/pages/auth/Signuppage.tsx`
- `frontend/src/pages/auth/ForgotPasswordPage.tsx`
- `frontend/src/pages/auth/ResetPasswordPage.tsx`
- `frontend/src/components/nav/Settings/user_settings.tsx`
- `frontend/src/pages/user/9_verification/Verification.tsx`

## Account access

- Existing users sign in at `/login`.
- New users begin registration at `/signup`.
- Email verification routes include `/verify-email` and `/setup/verify-email`.
- Password recovery begins at `/forgot-password` and continues at `/reset-password` using the issued recovery information.
- Google authentication is offered through the authentication pages when Firebase OAuth is configured.

## Onboarding

Authenticated onboarding uses personal-details, profile-image, and survey routes:

- `/setup/personal-details`
- `/setup/upload-image`
- `/setup/survey`

## Profile and settings

- `/profile` displays the signed-in user's profile.
- `/profile/:id` displays a selected profile.
- `/settings` contains account, subscription, wallet, help, display, and legal settings sections.

## Verification

- `/verification` starts or displays the personal verification workflow.
- `/account-verification-status` shows verification status.
- `/teams/:id/business-verification` handles business verification for a selected team.

Verification and financial actions are account-specific. The support assistant must not claim an account was verified or modified without an authorized backend operation.
