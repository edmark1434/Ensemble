# Current Task — Slim reports columns

Drop `reports.resolved_at`, `target_label`, and `reason`. Use `updated_at` on status changes; keep `type` + `description` (+ `target_type` / `target_id`).

## Acceptance Criteria

- [x] Migration drops the three columns.
- [x] Backend seed/repos/controllers stop using them; status patches bump `updated_at`.
- [x] Frontend types/UI use type/description instead of reason/targetLabel; no resolvedAt.
