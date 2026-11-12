# Active Task: Block self-suspend and moderator-on-moderator suspend

## Implementation Objective

Stop an admin from suspending their own account. Stop moderators from suspending other moderators or admin accounts. Only an admin can suspend a moderator.

## Acceptance Criteria

- [x] Backend rejects suspending your own account from user standing and the staff roster.
- [x] Backend rejects a non-admin suspending a moderator or admin account.
- [x] User, restrictions, report, and staff-roster UIs hide those suspend actions.
- [ ] Frontend typecheck passes (run when asked).
