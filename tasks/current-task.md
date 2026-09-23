# Current Task — Forgot & Reset Password Flow

Implement a secure, expiring password recovery flow:
1. User enters email at `/forgot-password`.
2. Backend generates a cryptographically secure token with a 15-minute expiration stored in Redis, and sends an email via Brevo matching the platform's email template.
3. User opens `/reset-password?token=...`, validates the 4 signup password rules (8+ chars, uppercase, lowercase, special character), and updates the password for their specific account.
4. Token is single-use and invalidated immediately. Existing sessions are cleaned up.

## Acceptance Criteria
- [x] Backend: Update `UserRepositories.js` with `getUserByEmailForPasswordReset` and `updateUserPassword`.
- [x] Backend: Update `UserServices.js` with `requestPasswordReset`, `resetPasswordWithToken`, `verifyResetToken`, and `sendPasswordResetEmail` (using platform Brevo template).
- [x] Backend: Security compliance with `docs/security.md` (no user enumeration, crypto random token, 15m TTL in Redis, single-use token consumption, session revocation, rate limiting under verification policy, exempt from CSRF for unauthenticated access).
- [x] Backend: Register `/forgot-password`, `/reset-password`, `/verify-reset-token/:token` in `backend/routes/User.js` and controllers.
- [x] Backend: Add route exemptions to `CsrfProtection.js`, `RequireCompletedOnboarding.js`, and `RateLimiter.js`.
- [x] Frontend: Wire up `ForgotPasswordPage.tsx` with error handling, loading states, and platform theme.
- [x] Frontend: Update `ResetPasswordPage.tsx` with live 4-rule signup password validation (8+ chars, uppercase, lowercase, special char), token verification, submission to API, and error handling.
- [x] Verification: Test password reset flow end-to-end with automated script and verify frontend build (`npm run build`).


