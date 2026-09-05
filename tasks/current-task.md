# Current Task — Violation expiry + report column clarification

1. Add `expires_at` to `violations` (active until expiry / pardon).
2. Do NOT merge report `by_account_id` with `assigned_staff_id` — they are different roles.
3. Explain report target_* / reason / resolved_at to user.

## Acceptance Criteria

- [x] Migration adds `violations.expires_at`; seed/create set it; active checks respect it.
- [x] Kept report assignee separate from reporter (explained to user).
- [x] Frontend/backend updated for expiry.
