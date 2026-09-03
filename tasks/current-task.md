# Current Task — Collapse duplicate dispute columns

Remove duplicate dispute columns and standardize on the original names:

- Parties: `by_account_id` / `for_account_id` (drop `initiator_account_id` / `respondent_account_id`)
- Kind: `type` only (drop `related_entity_type` / `related_entity_id`)
- Handler: `handled_by_staff_id` (drop `assigned_staff_id`)

## Acceptance Criteria

- [x] Migration backfills then drops the duplicate columns.
- [x] Backend list/detail/update/seed/chat use `by` / `for` / `type` / `handled_by_staff_id`.
- [x] Frontend dispute desk/modal still show parties, type, and handler.

## Verification

- Applied `1811200000000_151-collapse-duplicate-dispute-columns`.
- Dispute desk loads; claim/release/assign use `handled_by_staff_id`.
