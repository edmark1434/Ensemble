# Active Task: Change Session Timeout to Day Basis

## Implementation Objective

Update the platform session timeout setting from minutes to days across frontend and backend, accepting and saving days instead of minutes.

## Acceptance Criteria

- [x] `frontend/src/pages/admin/systemSettings/SystemSettingsPage.tsx` accepts and saves session timeout in days.
- [x] `frontend/src/pages/admin/systemSettings/settingsTypes.ts` includes `sessionTimeoutDays: number`.
- [x] `backend/lib/PlatformConfiguration.js` supports `platform.sessionTimeoutDays` (default 30 days) with backward-compatibility for minutes.
- [x] `backend/middleware/CheckSession.js` and `backend/services/UserServices.js` use day-based timeout for Redis session expiration.
- [x] Database migration `1827700000000_session-timeout-days.js` migrates `platform.sessionTimeoutMinutes` to `platform.sessionTimeoutDays` with both `up` and `down` handlers.
- [x] `npm run build` passes in `frontend/`.
- [x] Dynamic configuration tests pass in `backend/`.
