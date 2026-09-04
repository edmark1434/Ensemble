# Current Task — Dispute visibility boolean

Change `disputes.visibility` from varchar (`pending` / `parties` / `public`) to boolean (`false` = hidden, `true` = visible).

## Acceptance Criteria

- [x] Migration converts values and alters column type.
- [x] Backend mappers/updates/seed use boolean.
- [x] Frontend desk/modal filter and badges use Visible / Hidden.

## Verification

- Applied `1811600000000_155-dispute-visibility-boolean`.
- `false` = hidden (pending approval); `true` = visible after approve.
