# Current Task — Drop tickets.channel and related_dispute_id

Remove `channel` and `related_dispute_id` from tickets across DB, backend, and frontend. Keep `message_count`.

## Acceptance Criteria

- [x] Migration drops both columns (+ dispute FK).
- [x] Backend seed/repos/controllers stop using them.
- [x] Frontend types, filters, UI remove channel / related dispute.
