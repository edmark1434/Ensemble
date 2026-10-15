# Current Task: Ticket invite confirmation

## Objective
Staff confirm before adding someone to a ticket. Regular users must accept a notification before they can open it. Staff accounts are added immediately.

## Acceptance Criteria
1. Choosing a person in the ticket modal asks for confirmation before the add is sent.
2. Adding a regular user creates a pending invite and a notification with Accept and Decline. They cannot open the ticket until they accept.
3. Accepting adds them to the ticket chat and opens that conversation. Declining leaves them off the ticket.
4. Adding a staff account puts them on the ticket immediately, with no accept step.
