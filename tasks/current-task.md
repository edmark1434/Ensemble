# Current Task — Dispute type Title Case + default titles

Ensure `disputes.type` / related entity types use Title Case, auto-set titles to `{Disputee} v {Disputer} Transaction Dispute`, and keep create/seed paths consistent.

## Acceptance Criteria

- [x] Migration 148 Title-Cases existing `type`, `related_entity_type`, `priority`, and regenerates titles.
- [x] Migration 150 adds `Team` to the type CHECK enum.
- [x] Seed inserts Title Case types/priorities and default party-based titles.
- [x] Dispute updates normalize priority/type to Title Case before write (CHECK-safe).
- [x] Explain initiator/respondent/related entity/assigned/approved columns to the user.

## Verification

- Confirm sample dispute rows show Title Case types and `… Transaction Dispute` titles.
- Confirm patching priority from the desk still succeeds.
