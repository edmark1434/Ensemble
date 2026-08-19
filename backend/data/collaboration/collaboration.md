# Projects and Collaboration

Route source: `frontend/src/App.tsx`

## Projects

- `/projects` is the project list.
- `/projects/select` starts project format or configuration selection.

## Teams

- `/teams` lists teams available to the user.
- `/teams/:id` opens a selected team.
- `/teams/:id/business-verification` opens that team's business-verification flow.

## Forums

- `/forums` lists forum content.
- `/forums/group/:id` opens a forum group.
- `/forums/discussion/:postId` opens an individual discussion.

## Inbox

`/inbox/*` hosts direct and marketplace conversations. Specific child paths are selected by the inbox interface.

## Dashboard and tasks

- `/dashboard` opens the main dashboard.
- `/dashboard/tasks` shows tasks.
- `/dashboard/review` shows review work.
- `/dashboard/archived` shows archived work.
- Task details use `/dashboard/tasks/:id` or `/dashboard/review/:id`.

Dynamic paths require a resource the authenticated user is allowed to access.
