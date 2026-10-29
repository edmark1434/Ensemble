# Active Task: Move credit packages into System Settings

## Implementation Objective

Credit packages are edited only in System Settings → Economy. Remove the duplicate Credit packages section from Credits & Economy → Management.

## Acceptance Criteria

- [x] Credits & Economy Management no longer has a Credit packages section.
- [x] System Settings → Economy remains the editor for credit packages.
- [x] Links no longer send staff to `/admin/credit-economy?tab=management&section=packages`.
- [x] Fees, marketplace, and subscriptions stay on Credits & Economy Management.
- [ ] Browser-verified on both admin pages (frontend boot blocked by existing missing `canvas-confetti` import; backend could not connect to Postgres from this host).
