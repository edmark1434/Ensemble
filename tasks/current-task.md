# Current Task — Replace platform_settings with configuration

Move admin platform settings off the JSON `platform_settings` table and onto the existing `configuration` table (`configuration_key`, `name`, `description`, `current_value_literal`, `default_value_literal`, `updated_at`).

## Acceptance Criteria

- [x] New append-only migration widens `configuration` literals, copies each setting into its own row, and drops `platform_settings`.
- [x] Admin settings read/write, economy fees, moderation automation, cashout minimums, and RAG public settings use `configuration`.
- [x] Nested values (packages, fees, IP lists) are stored as string literals and reconstructed for the existing admin APIs.
- [x] Seed, archive schema notes, and admin UI copy reference `configuration`.

## Verification

- Apply `1810700000000_146-replace-platform-settings-with-configuration` against a non-production database.
- Confirm `/api/admin/settings-overview` still returns platform/moderation/economy/notifications/security sections.
- Confirm cashout and marketplace fees still resolve from `economy.feeSettings` / marketplace literals.
