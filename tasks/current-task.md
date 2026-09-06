# Current Task — Prevent Identity Verification Approval Without verification_url

Prevent administrators from approving identity verifications in the Moderation Dashboard (Identity Verification tab and modal) if no `verification_url` exists (or is empty) in the `verification_sessions` table for that user account.

## Acceptance Criteria

- [x] **Backend Persistence & Service Validation**:
  - In `backend/repositories/AdminUserTeamRepositories.js`:
    - Select `avs.verification_url` in `getUserVerificationRecord(accountId)` and `fetchAllUsers()`.
    - Populate `verification_url` and `has_verification_url` in `verificationMeta` and `buildVerificationDetail(row)`.
    - In `updateAccountVerification(accountId, action, ...)`: if `action` is to approve/verify a user account (`type != 'team'`), verify that a `verification_sessions` row exists with a non-null, non-empty `verification_url` (`NULLIF(TRIM(verification_url), '') IS NOT NULL`). If absent or empty, reject with an error: `"Cannot approve verification: no verification URL exists in the verification session"`.
  - In `backend/services/AdminVerificationServices.js`:
    - In `getAdminVerificationDetails(accountId)`: return `hasVerificationUrl` (`boolean`) and `verificationUrl` (`string | null`).
    - In `applyAdminDiditVerificationAction(accountId, action, ...)`: if approving a non-team account, verify that `record.verification_url` is non-empty before processing approval.
- [x] **Frontend Verification Modal & Moderation Dashboard**:
  - In `frontend/src/pages/admin/userTeam/userTeamTypes.ts`:
    - Add `hasVerificationUrl?: boolean` and `verificationUrl?: string | null` to `VerificationDetail` and `AdminVerificationDetails`.
  - In `frontend/src/pages/admin/moderation/IdentityVerificationTab.tsx` and `frontend/src/pages/admin/moderation/MyCasesTab.tsx`:
    - Pass `loadDiditDetails` prop to `<VerificationModal ... loadDiditDetails />` so session details and verification URL status are fully loaded.
  - In `frontend/src/pages/admin/userTeam/components/AccountModals.tsx`:
    - In `VerificationModal`:
      - Determine whether `hasVerificationUrl` is present (from `diditDetails` or `verification`).
      - For user accounts (non-team), disable the "Approve for {durationLabel}" button if `!hasVerificationUrl` (or while Didit session details are loading).
      - Add a warning banner explaining that approval is disabled because no verification URL exists in the verification session.
      - Add a guard in `apply('approve')` preventing submission if `!hasVerificationUrl` for a user account.
- [x] **Verification**:
  - Verify syntax and run unit/script checks on backend endpoints to ensure attempting to approve an unverified account without `verification_url` yields a 400 error.
  - Verify frontend builds cleanly with `npm run build` in `frontend/`.

Status: Completed.
