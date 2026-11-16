# Active Task: Editor Workspace panel

## Implementation Objective

Add a Workspace right panel to the editor using existing panel styling. Show the signed-in user's current contract milestone and all tasks assigned to them in the project's linked workspace, including work assigned by other members.

## Acceptance Criteria

- Resolve stored project/workspace links and enforce project and workspace access using the editor session.
- Select current milestones per user and contract, respecting subcontractor milestone assignments.
- Include all explicitly assigned workspace tasks, regardless of milestone ownership, without duplicates.
- Show milestone and task progress, percentages, totals, status counts, due dates and task filters.
- Match existing right-panel styling and navbar toggles; handle loading, errors, empty states and multiple workspaces.
- Refresh on panel open, focus, reconnect and periodically; discard obsolete requests.
- Preserve unrelated changes. Do not run builds, type checks, lint, tests or other verification commands.

## Implementation Status

- Added the Workspace navbar toggle and right panel with personal milestones, task progress and status filters, expandable details, and multiple-workspace selection.
- Added a session-authenticated read endpoint backed by a scoped repository query and service, using existing database relationships and no new dependencies or migrations.
- Added loading, empty and retry states; refreshes on open, focus, reconnect and every 30 seconds while visible. Requests are aborted on unmount and data resets on project/user changes.
- No builds, type checks, lint, tests or other verification commands run, per project instructions.
