# Active Task: Admin-owned warning duration and point thresholds

## Implementation Objective

Admin sets how long each named warning lasts when creating it. Staff cannot pick a duration at issue time. Admin also CRUD-creates warning-point thresholds that drive automatic product limits and auto-suspend.

## Acceptance Criteria

- [x] `warning_defs.duration_days` is set by admin (1–365). Issued warnings copy that clock.
- [x] Staff warn payloads cannot shorten or lengthen duration.
- [x] Admin-only CRUD for `warning_thresholds` (min points, effect, suspend days).
- [x] Live band and auto-suspend follow those rows, with the current ladder as fallback/seed.
- [ ] Apply migration `1826600000000_warning-duration-and-thresholds` when Postgres is reachable
