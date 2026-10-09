# Current Task: Member ticket form

## Objective
Signed-in members file a ticket at `/support/ticket`. The form explains the chosen type and asks only the extra questions for that type.

## Acceptance criteria
- `ticket_form_values` stores one row per extra answer, linked to `tickets`.
- Type, subject, description, and screenshots stay on the ticket and its chat.
- The form shows the type description before the extra questions.
- Staff ticket detail lists the saved answers.
- Run `cd backend && npm run migrate` so `1822800000000_ticket-form-values` is applied. The earlier catalog migration must already be applied.
