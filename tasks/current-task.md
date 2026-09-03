# Current Task — Normalize dispute numbers

Replace demo codes like `DIS-OPEN01` / `DIS-RSLV01` with sequential `DIS-50001` numbers (same pattern as tickets `TKT-50001`).

## Acceptance Criteria

- [x] Migration renumbers existing disputes to `DIS-#####`.
- [x] Seed uses sequential `DIS-50001+` numbers.
- [x] Shared `nextDisputeNumber()` helper for future creates.

## Verification

- Dispute desk shows `DIS-50001`-style numbers.
- Applied `1811300000000_152-normalize-dispute-numbers`.
