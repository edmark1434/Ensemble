# Current Task — Violation staff_id + restriction account_id

1. Violations: drop duplicate `issued_by_staff_id`; keep/use `staff_id` only.
2. Restrictions: add `account_id` FK; make `violation_id` nullable so restrictions can exist without a violation.

## Acceptance Criteria

- [x] Migration collapses issuer onto `staff_id`; updates seed/repos.
- [x] Migration adds `restrictions.account_id`; `violation_id` nullable; seed/repos support both.
- [x] Frontend/API still map issuer correctly via `staff_id`.
