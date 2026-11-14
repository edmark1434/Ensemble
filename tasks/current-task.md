# Active Task: Marketplace Moderator console — dashboard, tickets, reports hardening

## Implementation Objective

Make the Marketplace Moderator console (`/moderator/marketplace`) detailed, accurate and
correctly scoped: a professional dashboard, a ticket desk that only shows marketplace tickets
(with escalation to Admin and a proper "change category" flow for misfiled tickets), and a
report desk whose numbers match the platform's real report statuses.

## Acceptance Criteria

### Ticket management
- [x] Marketplace ticket list, counts and charts exclude tickets escalated to Admin or handled by an Admin.
- [x] Ticket detail / update / reply / message edit+delete reject tickets outside the marketplace queue (403).
- [x] Shared `/api/staff/tickets/:id/*` routes refuse specialist moderators on tickets outside their queue.
- [x] Staff-created tickets from a specialist desk must use that desk's ticket types.
- [x] New `recategorize` ticket action changes the category inside the same desk, keeps the handler and status, and records a timeline event with the reason.
- [x] Ticket detail splits "Change category" (same desk) from "Send to another desk" and "Escalate to Admin"; moves and escalations take an optional reason recorded on the timeline.
- [x] Escalation copy no longer claims only Support loses the ticket.

### Reports
- [x] Report status buckets include `under_review` / `escalated` (in review), `sanctioned` (resolved) and `denied` (dismissed).
- [x] Report rows include the reported account; desk shows it under the target.
- [x] Report detail shows marketplace context (linked listing, status, price) and how often the item/account has been reported; marketplace desk can open the listing review from the report.
- [x] Report desk accepts `?q=`, `?status=`, `?priority=`, `?assignee=` deep links; rows are keyboard accessible.

### Admin listing approvals (bug reported mid-task)
- [x] Admin Moderation → Pending cases → Listing approvals no longer shows "Could not load this listing": the modal passed the UUID listing id through `Number()`, requesting `/listings/NaN` (500).
- [x] Listing and seller endpoints answer a malformed id with 404 instead of 500; listing ids are typed as `string` across the marketplace UI.

### Dashboard
- [x] Overview returns a 14-day activity series, ticket and report SLA figures, marketplace team workload and sellers with the most open reports.
- [x] Dashboard redesigned: attention list, primary KPIs, activity trend, queue health, team workload, sellers to watch, active ticket and report queues, recent submissions. No gradients.
