# Active Task: Staff ERD types

## Implementation Objective

Align `staff` with the ER diagram: `role` is an enum, name/email/password fields are unbounded strings.

## Acceptance Criteria

- [x] Migration creates `staff_role` and converts `staff.role`.
- [x] `password_hash`, `firebase_staff_uuid`, `first_name`, `last_name`, and `email_address` are unbounded `varchar`.
- [x] Alias roles such as Jobs Moderator map to `Jobs N Gigs Moderator`.
- [x] `docs/database.md` records the mapping.

Apply with `cd backend && npm run migrate` against the intended database.
