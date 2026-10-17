# Current Task: Account ban, suspension, timeout, and lock

## Objective
Member standing matches the four access rules: a ban can only appeal and review tickets and disputes, a suspension is temporary and read-only, a forum timeout blocks forum changes, and a lock stops sign-in.

## Acceptance criteria
- [x] Banned members can sign in only to create an appeal and view their tickets and disputes.
- [x] Suspended members can read the platform and cannot change anything until the suspension end time.
- [x] A forum timeout blocks posts, comments, reactions, and other forum changes.
- [x] A locked account cannot sign in until staff unlock it.
- [ ] Run `cd backend && npm run migrate` so `accounts.suspension_ends_at` exists.
