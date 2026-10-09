# Current Task: Staff ticket catalog

## Objective
Admin and moderator desks use the new ticket groups. Support is split into subgroups. Members still file with the previous labels until that form is updated.

## Acceptance criteria
- Existing ticket types are remapped by `1822700000000_ticket-catalog-v2`.
- Support desks can filter by Account, Billing, Video Editing Platform, Messaging, Safety and appeals, and General.
- Status includes Escalated to Dev. It does not close the ticket.
- Account compromised, Payouts and withdrawals, Copyright claim, and Delivery and disputes default to High. Notifications and email defaults to Low.
- Each type has a reply guide. Any moderator can move a ticket to another group.
- Run `cd backend && npm run migrate` before using the new types.
