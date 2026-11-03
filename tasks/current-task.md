# Current task: Restore admin tickets and economy overviews

## Objective

Stop `/api/admin/tickets-overview` and `/api/admin/economy-overview` from returning 500 after dispute and credit-transaction columns became PostgreSQL enums.

## Scope

- `backend/repositories/AdminTicketsRepositories.js` (`fetchRecentActivity`)
- `backend/repositories/SupportModeratorRepositories.js` (`getTicketLog`)
- `backend/repositories/AdminEconomyRepositories.js` (`getEconomyOverview` transaction stats)

## Acceptance criteria

- The ticket activity union casts `disputes.status` to text so it can combine with ticket and report statuses.
- Economy stats call `LOWER(status::text)` on `credit_transaction_status`.
- Both queries succeed against the current database.
