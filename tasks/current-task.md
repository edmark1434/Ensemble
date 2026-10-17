# Current Task: Admin video project management

## Objective
Moderation → Management → Video lists editor projects and lets an admin inspect them and freeze editing.

## Acceptance criteria
- [x] Admin can search and filter projects and open owner, members, scenes, size, and edit counts.
- [x] Freeze stops new editor writes and renames. Unfreeze restores the previous status.
- [x] Apply `cd backend && npm run migrate` so freeze metadata columns exist.
