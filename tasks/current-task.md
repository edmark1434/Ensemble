# Active Task: Side Nav Workflow Grouping & Delivery Flow Alignment

## Implementation Objective

1. **Workflow Navigation Grouping (COMPLETED)**
    - [x] Moved **Chat Inbox** (`/inbox`) into the **Workflow** section of [`user_nav.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/components/nav/user_nav.tsx).
    - [x] Updated Workflow items to:
        - **Dashboard** (`/dashboard`)
        - **Workspace** (`/workspaces`)
        - **Chat Inbox** (`/inbox`)
    - [x] Maintained realtime unread counter badge on **Chat Inbox** in both expanded and collapsed side nav modes.
    - [x] Active state path matching updated for `/inbox` within Workflow.

2. **Records Section Renaming & Cleanup (COMPLETED)**
    - [x] Renamed the side nav section header from "Activity & Records" to **Records**.
    - [x] Streamlined `recordsInitial` items:
        - **My Terms** (`/terms-of-services`)
        - **My Contracts** (`/contracts`)
        - **Transaction History** (`/transactions`)
    - [x] Cleaned up unused inbox badge logic from the Records list rendering.

3. **Workspace & Teams Dedicated Pages (COMPLETED in prior commit `41796bf8`)**
    - [x] Separated Teams and Workspaces into distinct pages (`/teams` for general teams, `/workspaces` for project workspaces).
    - [x] Removed "Project Workspaces" tab from Teams.
    - [x] Configured Workspaces tabs to strictly include "All Workspaces", "Active Workspaces", and "Archived" (no General Teams tab).

4. **Contract Status & Delivery Flow Alignment (COMPLETED)**
    - [x] Aligned [`DeliveryFlowGuide.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/8_dashboard/dashboard_components/DeliveryFlowGuide.tsx) with the formal contract lifecycle defined in [`ContractsTerminologyGuide.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/contracts/ContractsTerminologyGuide.tsx) and the database schema.
    - [x] Updated 4-step pipeline to reflect:
        - Step 1: `Waiting` (Agreement & Escrow)
        - Step 2: `Active` (Milestone Execution & Payout)
        - Step 3: `Done` (All Milestones Approved)
        - Step 4: `Closed` (Mutual Ratings & Archive)
    - [x] Expanded Contract Statuses breakdown to include all 6 statuses:
        - `Waiting`
        - `Active`
        - `Done`
        - `Closed`
        - `Cancelled`
        - `Dispute Filed`

## Verification

- `frontend/src/components/nav/user_nav.tsx` and `frontend/src/pages/user/8_dashboard/dashboard_components/DeliveryFlowGuide.tsx` type-checked and compiled cleanly via `npm --prefix frontend run build` (38.25s, 0 errors).
- Git tree clean, changes committed in `aa55f666`.
