# Current Task: Member ticket form behind login

## Objective
The submit-ticket form lives inside the signed-in app at `/support/ticket`. Logged-out visitors cannot open it. The account menu includes Get Support.

## Acceptance criteria
- `/support/ticket` renders the ticket form inside the member layout.
- `/landing/SubmitATicket` and `/landing/submitaticket` redirect there.
- A signed-out visit goes to `/login?redirect=/support/ticket`.
- The profile menu has Get Support under Submit Feedback.
