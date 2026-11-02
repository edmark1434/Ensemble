# Active Task: Fix admin dispute detail 500

## Objective

Restore `GET /api/admin/disputes/:id` after PostgreSQL enum migrations broke `LOWER()` on `staff.role` / dispute columns.

## Acceptance Criteria

1. Opening an admin dispute detail no longer returns 500.
2. Assignable staff query casts `staff.role` to text before `LOWER()`.
3. Related dispute list/count queries cast `dispute_status` / `dispute_type` / `dispute_priority` / `staff_role` to text where `LOWER()` is used.
