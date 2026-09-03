# Current Task — Align ticket tables to ERD

Remove the extra ticket catalog tables so the schema matches the ticket ERD: `tickets` plus `ticket_chats`.

## Acceptance Criteria

- [x] Drop `ticket_type_catalog`, `ticket_status_catalog`, and `ticket_priority_catalog`.
- [x] Keep `type`, `status`, and `priority` on `tickets` as constrained enum-like columns.
- [x] Keep `ticket_chats` as the ticket-to-chat link (`ticket_id`, `chat_id`).
- [x] Admin ticket type/status/priority lists come from `TicketEnums`, not catalog tables.

## Verification

- Apply `1810800000000_147-align-tickets-to-erd`.
- Confirm the three catalog tables are gone.
- Confirm ticket create/list still accepts the same type, status, and priority labels.
