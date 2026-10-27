# Active Task: Gig Contract Lifecycle & Workspace Auto-Provisioning

## Implementation Objective

1. **Contract Formation on Order Acceptance**:
   - When a freelancer reviews and accepts a gig order (`acceptGigOrderRepository`), generate a formal contract entry in `contracts` in `Waiting` status (awaiting escrow funding).
   - Link contract in `gig_contracts` and insert pending milestones in `contract_milestones`.
   - Client and freelancer can view the contract agreement in `Waiting` status.
2. **Contract Activation & Escrow Funding**:
   - When client confirms and funds the contract (`confirmGigOrderContractRepository`), debit client wallet -> credit freelancer escrow hold, update contract `status = 'Active'`, set `starts_at = NOW()`, set contract deadlines, and activate the first milestone.
   - Update `gig_requests.status = 'In Contract'`.
3. **Gig Workspace Auto-Provisioning & Self-Healing Backfill**:
   - Auto-create contractual workspace (`teams` row with `team_type = 'contractual'`, `gig_id = gig_id`, and `team_contract_workspaces` linking `team_id` and `contract_id`).
   - Client is registered as `Owner`; Specialist (and any studio team members) registered as `Member`.
   - Pre-populate `team_workspace_tasks` from `contract_milestones`.
   - Link video `project_id` if selected in the order.
   - Ensure pre-existing gig contracts (e.g. `add06d81-55d9-4eb8-87d2-72fa60074d34`) are backfilled and self-healed on access.
4. **UI Navigation & Workspace Type Indicators**:
   - On `/contracts/:id`, display `Waiting` status with a clear CTA for the buyer to fund escrow and launch the workspace.
   - If `contract.teamId` is present, primary action button opens `/team-project/:teamId` instead of legacy `/dashboard/tasks/:contractId`.
   - If a user navigates to `/dashboard/tasks/:contractId`, auto-resolve `team_project_id` and redirect directly to `/team-project/:teamId`.
   - Display a distinct badge indicator (**Job Workspace** vs **Gig Workspace**) in the workspace cards on `/workspaces` and in the project header on `/team-project/:id`.

## Implementation Checklist

- [x] Create append-only migration `1825700000000_add-gig-id-to-teams.js` adding `gig_id` to `teams` table.
- [x] Run `npm run migrate` to apply migration to database.
- [x] Implement `ensureContractualGigWorkspace` in `backend/repositories/TeamProjectRepositories.js`.
- [x] Update queries in `TeamProjectRepositories.js` (`getTeamProjectDetails`, `getProjectTaskboard`, `updateProjectTask`, `deleteProjectTask`, `unlockSequentialMilestones`, `updateProjectDetails`, `deleteProject`, `getProjectContracts`, `getProjectMilestones`, `getWorkspaceProjects`) to support both Jobs and Gigs.
- [x] Update `listTeams` in `backend/repositories/TeamsRepositories.js` to include gig contracts in `review_status` subquery and return `workspace_type`.
- [x] Update `backend/repositories/GigRepositories.js`:
  - `acceptGigOrderRepository`: Create contract in `status = 'Waiting'`, link `gig_contracts`, create pending `contract_milestones`.
  - `confirmGigOrderContractRepository`: Transition contract to `status = 'Active'`, activate first milestone, call `ensureContractualGigWorkspace`.
  - `getOrderByIdRepository`: Select `tcw.team_id as workspace_team_id` and `cnt.status as contract_status`.
- [x] Update `backend/services/GigServices.js`: Pass `contractId` and `teamId` in notifications and responses.
- [x] Update `backend/repositories/ContractRepositories.js`: Include `tcw.team_id as team_id` in contract queries.
- [x] Update `backend/repositories/DashboardRepositories.js`:
  - Populate `team_project_id` for gig contracts in `getTasks` and `getTaskById`.
  - Add self-healing check in `getTaskById` to auto-provision workspace if missing.
- [x] Create append-only migration `1825800000000_backfill-gig-workspaces.js` and backfill all pre-existing active/waiting/completed gig contracts into contractual workspaces.
- [x] Frontend Updates:
  - `incoming_order_detail.tsx` & `sent_order_detail.tsx`: Link to contract when `Accepted`, link to `/team-project/:teamId` when `In Contract`.
  - `ContractDetailsPage.tsx`: Handle `Waiting` status with clear funding prompt, and navigate to `/team-project/:teamId` when workspace exists.
  - `dashboard_main.tsx`: Direct card clicks for tasks with `team_project_id` straight to `/team-project/:teamId`.
  - `DashboardTaskDetail.tsx`: Auto-redirects to `/team-project/:teamId` upon loading task with `team_project_id`.
  - `Workspaces.tsx`: Added **Job Workspace** and **Gig Workspace** pill tags in both Grid and Compact views.
  - `TeamProjectWorkspace.tsx`: Added **Job Workspace** and **Gig Workspace** tags in the project workspace header.
- [x] Verification & Build:
  - Verify migration applied.
  - Run frontend build: `npm --prefix frontend run build` (verified in 22.4s).
