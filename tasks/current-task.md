# Active Task: Admin-dynamic warning catalog

## Implementation Objective

Admins can create, edit, and hide named warnings with locked points. Staff pick those rows when warning. Merit taken is always warning points × 2.

## Acceptance Criteria

- [x] `warning_defs` stores the catalog; seed from the original presets.
- [x] Admin CRUD at `/admin/warnings` with live merit/duration preview.
- [x] Staff pickers load the live catalog; points stay locked on issue.
- [x] Merit conversion is points × 2 (1pt −2 / 3d … 5pt −10 / 14d … 10pt −20 / 90d).
