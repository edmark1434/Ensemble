# Current Task: Implement Kanban 4 Board & Card Detail Side Panel in Taskboard

## Objective
Implement the "Kanban 4" style board and card detail side panel in `ProjectTaskboardTab.tsx` for `/team-project/:id`:
1. **Interactive Kanban 4 Board**:
   - 4 status columns: `To do`, `In progress`, `In review`, `Done`.
   - Drag-and-drop between columns with a dashed drop placeholder and status persistence via `/api/team-projects/:id/tasks/:taskId`.
   - Task cards with clean issue keys (`#TSK-01` / `#CPV-01`), status dot, title, description preview, milestone badge, subtask indicator, and assignee avatar.
   - Selected card highlighted with a crisp white ring (`ring-2 ring-white`).
2. **Card Detail Side Panel**:
   - Responsive: Docks side-by-side with board on desktop ($\ge 1024$px); slides over with backdrop on mobile.
   - Header: Task issue key, status pill, close button (`✕`), task title.
   - Attributes box: Assignee, Priority, Milestone (strictly locked to contract milestone, non-movable), Due Date.
   - "Move to" segmented button row (`To do`, `In progress`, `In review`, `Done`) with active white highlight.
   - Subtasks checklist with interactive completion toggles.
3. **Permissions & Milestone Enforcement**:
   - Creator auto-assignment: when creating a task, only the creator is assigned under their milestone.
   - Only the assigned member can drag the task or change status; others have view-only access.
   - Milestone lock: tasks from locked milestones cannot be dragged or advanced. Tasks cannot be moved between milestones.

## Rule Reminder
- Do NOT commit changes until the user gives explicit signal.

- [x] Assignee filter dropdown upgraded to GlideSelect with assignee profile pictures.
- [x] Smooth animated tab switching between Board, List, Table, and Gantt (sliding indicator & cross-fade).
- [x] Card detail opens as a clean centered popup modal (with backdrop, ESC & backdrop dismissal).
- [x] Task issue keys (`#TSK-01` / `#CPV-01`) render with status indicator dots.
- [x] Milestone scoping and locked status rules enforced.
- [x] Assignee-only editing rules respected (view-only for non-assignees).
- [x] Design tokens follow the neutral dark theme (`zinc` / `dark-base` / `dark-surface`).
- [x] `cd frontend && npm run build` compiles with 0 errors.
- [x] No git commit performed until user explicitly requests it.
