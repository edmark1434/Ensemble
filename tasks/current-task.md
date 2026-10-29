# Active Task: Standing punishment catalog for ban, suspend, and timeout

## Implementation Objective

Staff pick a predefined ban, suspension, or timeout (with default duration) and can override the clock. Admin CRUD lives next to the warning library.

## Acceptance Criteria

- [x] `punishment_defs` table seeded from platform harms (forums, jobs, gigs, marketplace, inbox, identity, money).
- [x] Admin CRUD for standing punishments (kind, duration or permanent, desks, note).
- [x] Ban / suspend / timeout pickers require a catalog row, allow custom duration, and require a reason.
- [x] Backend copies catalog duration unless staff send a custom clock. Kind must match the action.
- [x] Docs updated. `tsc --noEmit` succeeds.
