# Current Task: Open tickets until a staff member claims them

## Objective
New support tickets start as Open. Staff cannot reply, add notes, or change the thread until they claim the ticket or are already the assignee. Claiming moves the ticket to In Progress. Releasing it returns an in-progress ticket to Open.

## Acceptance criteria
- [x] New tickets are stored as Open unless a handler is set at creation.
- [x] Staff replies, internal notes, edits, and deletes require the current handler.
- [x] The ticket desk hides the reply box until the viewer is the assignee.
- [x] Database status check allows Open, In Progress, and Closed.
