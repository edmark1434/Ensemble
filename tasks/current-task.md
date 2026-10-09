# Current Task: Member ticket form fields

## Objective
The signed-in ticket form asks the shared fields plus the type-specific questions, explains the type, and files the ticket on the session account. Sign-in and account-compromised tickets can be filed while logged out.

## Acceptance criteria
- Extra answers are rows in `ticket_form_values` with primary key `(ticket_id, field_key)`.
- Required questions are enforced on the server. Conditional questions appear only when they apply.
- Projects, orders, listings, contracts, and jobs use the member's own records when that list is available.
- Member id, username, email, plan, time, browser, device, and referring page are saved without asking.
- Admin and every moderator desk use the same 41 types. The ticket detail shows the member's answers in form order, then the captured account and device details.
- Run `cd backend && npm run migrate` so the catalog migration and `1822800000000_ticket-form-values` are applied.
