# Active Task: Move Credit & Economy Management into Settings

## Implementation Objective

Put the entire Credits & Economy Management tab (fees, marketplace, subscriptions, and packages) in System Settings → Economy. Credits & Economy keeps overview, wallets, and audit only.

## Acceptance Criteria

- [x] Credits & Economy has no Management tab.
- [x] Settings → Economy includes packages, fees, marketplace rules, and subscriptions.
- [x] `/admin/credit-economy?tab=management` redirects to Settings → Economy.
- [x] `tsc --noEmit` succeeds for the changed pages.
