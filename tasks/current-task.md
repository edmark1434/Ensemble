# Active Task: Fix Navigation to Contract & Members -> Members Tab

## Objective

Fix "View Roster" and "Manage Members" links on the workspace Overview tab so that clicking either navigates to the "Contract & Members" top-level tab with the "Members" sub-tab actively selected.

## Acceptance Criteria

1. **Tab Navigation Handling**:
   - In `TeamProjectWorkspace.tsx`, update `handleTabChange` to handle `tab === 'members'` by selecting `'contract'` for `activeTab` and setting `tab=members` in `searchParams`.
   - Add a `useEffect` in `TeamProjectWorkspace.tsx` to keep `activeTab` synchronized when `searchParams.get('tab')` changes.
2. **Sub-Tab State Synchronization**:
   - In `ProjectContractAndMembersTab.tsx`, sync `subTab` with `defaultSubTab` and `searchParams` via `useEffect`.
   - Update the "Contracts" and "Members" sub-tab click handlers to persist the selected sub-tab in URL query parameters (`tab=contract` and `tab=members`).
3. **Verification**:
   - Run `cd frontend && npm run build` to verify clean build with 0 errors.
