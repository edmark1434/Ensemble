# Current Task: Seamless Optimistic Task Updates, "On Review" Status & Milestone Task Completion Gate

## Objective
1. **Optimistic & Seamless Taskboard Updates (Zero Skeleton Reload)**:
   - Eliminate full-screen skeleton flash when setting status, priority, or due dates on tasks.
   - Local optimistic state in `ProjectTaskboardTab.tsx` for immediate 0ms UI card transitions.
   - Reconcile data in background with `loadProjectData(true)` without triggering `isLoading = true`.
2. **"On Review" Task Status**:
   - Added `"On Review"` across Board, List, Table, and Gantt views.
   - Milestone submissions automatically transition tasks to `"On Review"`.
   - Milestone deliverables cannot be submitted for client review unless all tasks for that milestone are completed.
3. **Task Creation, Assignment & Contract Protection Rules**:
   - **Auto-Assignment to Creator**: Whenever a contributor creates a task, the assignee is automatically the creator (`currentUserAccountId`). Other members cannot create tasks and assign them to you.
   - **Clients Cannot Create Tasks**: Clients cannot add tasks to the taskboard (hidden in UI, rejected with HTTP 403 in backend).
   - **Default Milestone**: Pre-selected to the contributor's currently assigned milestone.
   - **Contract Immutability**: Tasks originating from the contract (`is_contract_task = true`) cannot have their title or scope edited, nor can they be deleted by contributors. Only user-created tasks can be edited and deleted by their creator.
   - **Card Status Display Polish**: Removed the bulky text button (`[• IN PROGRESS ⌄]`) from the card footer that wrapped onto two lines. Made the existing compact `<Tag />` icon the interactive status trigger (colored by status), keeping card footers clean and single-line.
   - **Milestone-Specific Due Date Picker**: When setting a task due date, min and max dates are strictly bounded to that specific milestone's start and deadline (calculated from sequential `duration_hours`), preventing dates from spilling into other milestones.

## Acceptance Criteria
- [x] Changing task status, priority, due date, or checklists updates immediately with 0ms delay and never triggers full skeleton loading.
- [x] Taskboard Board view has 4 columns including "ON REVIEW".
- [x] Taskboard List and Table views support "ON REVIEW" with high-contrast amber styling.
- [x] Submitting milestone deliverable or sending submission update automatically sets associated milestone tasks to "On Review".
- [x] Contributors cannot submit milestone deliverable for client review if any tasks for that milestone are incomplete (blocked with warning banner and backend check).
- [x] Creating a task auto-assigns it to the creator. Other members and clients cannot assign tasks to you.
- [x] Clients cannot create tasks on the taskboard.
- [x] Contract-defined tasks cannot have their title modified or be deleted.
- [x] The bulky "IN PROGRESS" text button is replaced by the clickable Tag icon with status coloring.
- [x] Due date picker is strictly bounded to the specific milestone's duration/timeline.
- [x] Status dropdown menu in Board view is aligned `right-0` and column overflow clipping is removed, preventing text from clipping (`IN PROGRESS`, `ON REVIEW`, `COMPLETE`).
- [x] `cd frontend && npm run build` compiles cleanly with zero TypeScript or Vite errors.
