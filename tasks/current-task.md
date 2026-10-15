# Current Task: Require Account Password Before Enabling 2FA

## Objective
Enforce validation requiring users (especially those signed up via Google OAuth who do not yet have a password) to set an account password before they can enable Two-Factor Authentication (2FA).

## Acceptance Criteria
1. **Repository Layer (`backend/repositories/AccountRepositories.js`)**:
   - Implement `checkAccountHasPassword(accountId)` to query `users` (and `staff`) table for a valid, non-empty `password_hash`.

2. **Service Layer (`backend/services/AccountServices.js`)**:
   - `get2FAStatusService(accountId)` returns `hasPassword: boolean`.
   - `setup2FASecretService(accountId)` validates that the account has a password set; throws an informative 400 error if missing.
   - `verifyAndEnable2FAService(accountId, token)` verifies that the account has a password set before enabling 2FA.

3. **Controller Layer (`backend/controllers/UserControllers.js`)**:
   - `setup2FAController` and `enable2FAController` return 400 with the service error message when a password is required.

4. **Frontend Settings UI (`TwoFactorSettingsSection.tsx` & `user_settings.tsx`)**:
   - Show a warning / guidance banner when `!status.enabled && !status.hasPassword` explaining that a password must be set first.
   - Disable or block 2FA setup toggle / button with clear toast notification if `!status.hasPassword`.
   - Dispatch `ensemble:account-updated` when user sets a password in `UserSettingsAccountDetails` so the 2FA section automatically refreshes its `hasPassword` status.

5. **Verification**:
   - Run backend check validating password existence check on accounts with and without passwords.
   - Run frontend `npm run build` to ensure zero compilation or typing errors.
