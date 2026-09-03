# Current Task — Seed recommended ENSEMBLE platform fees

Load the recommended fee structure into `platform_settings.economy`, including cashout/withdrawal fee, and wire cashout + marketplace fees to read from settings.

## Acceptance Criteria

- [x] Migration upserts recommended fee settings and marketplace settings.
- [x] Cashout fee uses `fee-cashout` from platform settings (3.5% default).
- [x] Asset marketplace sale fee uses 15% from settings.
- [x] Admin defaults match the recommended structure.

Status: Completed.

## Verification

- Migration `1800600000000_145-seed-recommended-platform-fees` applied.
- Platform fee loader returns 12 fee rows, cashout 3.5%, marketplace 15%.
- Backend syntax checks passed; frontend build passed.
