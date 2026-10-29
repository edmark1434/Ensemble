# Active Task: Staff create ticket for a member

## Implementation Objective

Let any staff member or admin open a support ticket on another account from the ticket desks.

## Acceptance Criteria

- [x] `POST /api/staff/tickets` (any staff) and `POST /api/admin/tickets` (admin) require a requester account, type, subject, and description.
- [x] The ticket is owned by the chosen member. Staff can assign it to themselves only when their role can handle that type.
- [x] Admin, Support, Forum, Marketplace, and Jobs ticket desks have a Create ticket form with member search.
- [x] Frontend build succeeds.
