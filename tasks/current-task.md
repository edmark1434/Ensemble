# Current Task: Assignee-Only Task Permissions & Dual Gantt Chart (Milestones & Tasks)

## Objective
1. **Assignee-Only Status Permissions**:
   - Backend (`TeamProjectRepositories.js`): Enforced that only the user assigned to a task can update its `status` (`status !== undefined && !isAssignee`). Non-assignees are rejected with an error.
   - Frontend (`ProjectTaskboardTab.tsx`): 
     - Only the assigned team member sees interactive status controls (`<select>`).
     - Non-assignees see a read-only status pill with a lock indicator and tooltip (`Assigned to <Name> (View only)`).
2. **Assignees Set Due Date & Priority**:
   - Assignees can set and update `due_at` and `priority` for their tasks directly.
   - Frontend supports inline editing of due date (via calendar button / date input) and priority (via flag selector) across Board, List, and Table views.
   - Backend supports persisting `due_at` and `priority` updates.
3. **Dual Gantt Chart**:
   - Updated Gantt View to show two distinct charts:
     - **Milestones Overall Schedule**: shows all contract deliverables, order index, escrow budget credits, assigned contributor (avatar, name, handle), milestone status, and horizontal timeline bars with completion percentages.
     - **Tasks Detailed Schedule**: shows all tasks, milestone tags, assigned members (avatar, name), priority flags, due dates, and schedule timeline bars.
   - Added sub-filter pills: `All Schedules`, `Milestones (<count>)`, and `Tasks (<count>)`.

## Status: Complete

## Verification
- Frontend build: `npm run build` in `frontend/` completed successfully with 0 errors (`✓ built in 4.17s`).
- Backend query & permission verification completed.
