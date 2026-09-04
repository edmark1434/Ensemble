# Current Task — Drop dispute approval columns

Remove `approved_at` and `approved_by_staff_id` from disputes. Approval remains status + visibility only (Approve → open + visible).

## Acceptance Criteria

- [x] Migration drops both columns.
- [x] Backend seed/repos stop reading/writing them.
- [x] Frontend types/UI have no approval timestamp/staff fields.

## Verification

- Applied `1811700000000_156-drop-dispute-approval-columns`.
- Approve still sets `status = open` and `visibility = true`.
