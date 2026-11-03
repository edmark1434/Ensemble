# Current task: Clean up the staff/admin ticket UI

## Objective

Reorganize the ticket detail view used by the admin desk and every moderator desk so it matches the cleaned-up dispute modal, without changing backend behavior.

## Scope

- `frontend/src/pages/admin/ticketManagement/TicketDetailModalShell.tsx` (shared by admin and all moderator desks)
- `frontend/src/pages/moderator/shared/staffCaseUi.tsx` (shared buttons, pills, sidebar sections, confirm dialog, tabs; also used by the dispute modal)
- `frontend/src/pages/admin/ticketManagement/ticketTypes.ts` (duplicate `TicketPerson` type split into `TicketParticipant`)
- Ticket list tables in `TicketManagementPage.tsx`, `support-moderator/TicketManagement.tsx`, `ModeratorTicketDesk.tsx`, `moderator/shared/ui.tsx`

## Acceptance criteria

- Header shows number, subject, requester, dates, and status/priority/type/handler/escalated/awaiting pills, plus a Transcript button.
- Main column has "Conversation" and "Details" tabs; the composer stays pinned and switches between "Reply to member" and "Internal note".
- Sidebar groups actions into Handler, Ticket (status, priority, closing), Appeal decision, People, Credit change, and Move ticket.
- One Save button, enabled only when status, priority, or handler changed.
- All confirmations (remove, add, schedule close, move, escalate to Admin, appeal) use the shared dialog.
- No gradients; existing dark staff theme.
- `npx tsc --noEmit -p tsconfig.app.json` reports no errors in the files above, and `npm run build` passes.

## Note

`npm run build` runs `tsc --noEmit` against `tsconfig.json`, which has `"files": []`, so it type-checks nothing. Use `tsconfig.app.json` for a real check (about 845 pre-existing errors elsewhere).
