# Current Task — Drop tickets.related_report_id

Remove `related_report_id` from tickets and clean frontend/backend references. Keep `related_dispute_id`.

## Acceptance Criteria

- [x] Migration drops `related_report_id` (+ FK).
- [x] Backend seed/repos/create stop using it.
- [x] Frontend types/filters remove `relatedReportId` / `has_report`.
