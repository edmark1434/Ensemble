# Active Task: Credit transaction enum migration

## Implementation Objective

Finish `credit_transactions.type` / `status` native enums after production migrate failed on partial-index rewrite.

## Acceptance Criteria

- [x] `1827200000000_credit-transaction-native-enums` drops the three `type` partial unique indexes, converts the columns, then recreates the indexes with enum casts.
- [x] Down path restores varchar columns, the type CHECK, and the original indexes.
- [x] `docs/database.md` notes why the indexes are rebuilt.

Apply with `cd backend && npm run migrate` against the intended database.
