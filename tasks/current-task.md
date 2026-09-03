# Current Task — Audit dispute UI against schema

Verify frontend/backend dispute UIs match the collapsed schema: no outcome, related_entity_*, initiator/respondent columns, assigned_staff_id, or sanction_notes; use by/for, type, handled_by_staff_id, resolution_notes, type-aware titles, DIS-##### numbers.

## Acceptance Criteria

- [x] No frontend dispute refs to removed fields (`outcome`, `relatedEntity*`, `sanctionNotes`).
- [x] Desk/modal/dashboards use `type` and handler via `assignee` / `handled_by_staff_id`.
- [x] Profile mock disputes aligned (status, `DIS-#####`).
- [x] Frontend build passes (`tsc` + vite).

## Verification

- `cd frontend && npm run build` succeeded.
- Dispute desk shows type chip + Type filter; detail uses resolution notes + sanction type only.
