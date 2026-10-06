# Current Task: Ticket help tools

## Objective
Let members and staff attach screenshots to tickets using the existing S3 bucket, and give Admin the ticket audit, overdue queue, reply guides, satisfaction score, and payment check. Support keeps its current permissions.

## Acceptance criteria
- Screenshots upload to the existing bucket under `ticket-attachments`. No new bucket.
- Staff reply boxes and the member ticket form accept up to 4 images.
- Ticket detail shows an audit timeline, reply guides for that type, and payment evidence when the role needs it.
- Admin and Support can record a credit change on payment-related tickets. Forum moderators do not see payments. Marketplace and Jobs see payments only on money-related ticket types.
- Overdue tickets are filterable. Resolved tickets can be rated from inbox. Analytics shows the average score.
- Run `cd backend && npm run migrate` before using the new columns.
