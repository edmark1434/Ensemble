# Active Task: Store ticket answers on the ticket

## Implementation Objective

Keep each ticket type's answers in `tickets.form_answers`, and keep the submit-time account snapshot in `tickets.submission_context`.

## Acceptance Criteria

- [x] New tickets write both JSON columns in the same insert as the ticket.
- [x] Existing `ticket_form_values` rows are copied, then the table is dropped.
- [x] Picker answers store the member's record id and the name shown at submit time.
- [x] Staff ticket detail shows answers and the submit snapshot separately.
