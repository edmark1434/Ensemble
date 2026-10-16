# Current Task: Chat Member Profile Options Menu & Merge Contract and Members Tabs

## Objective
1. **Chat Member Profile Options Menu**:
   - In Team Project Chat (`ProjectChatTab.tsx`), clicking a member's profile (in the member roster or in message bubbles) opens an interactive contextual options menu with:
     - **View Profile**: navigates to `/profile/:accountId`.
     - **Follow User**: checks live follow status (`/api/accounts/:accountId/follow-status`), toggles follow/unfollow via `/api/accounts/:accountId/follow`, and shows immediate status feedback.
     - **Message**: opens a direct conversation with that member via `useChatState.getState().openDirectChat({ account_id, name, avatarUrl })`.
     - **Report User**: opens `ReportMemberModal` to report that specific member with reason and description, saving to the PostgreSQL `reports` table.
2. **Merge Contract and Members Tabs into "Contract & Members"**:
   - In `TeamProjectWorkspace.tsx`, merged the separate `Contract` and `Members` tabs into a single unified tab named **Contract & Members**.
   - Created `ProjectContractAndMembersTab.tsx` combining both views with clean sub-tab switching:
     - **Contracts (N)**: displays the contract cards and escrow details with sequential position and escrow security.
     - **Members (N)**: displays the contributors roster and contractual team policy notice.
   - Maintained backward and direct URL compatibility (`?tab=contract` or `?tab=members`).

## Status: Complete

## Changes Implemented
1. **Backend Member Reporting**:
   - Updated `backend/services/TeamsServices.js` (`report`) to accept `targetAccountId`.
   - Updated `backend/repositories/TeamsRepositories.js` (`addReport`) to record `for_account_id = targetAccountId`, `target_type = 'Member'`, and `target_id = targetAccountId` when reporting a specific member.
2. **Chat Member Profile Options Menu**:
   - In `ProjectChatTab.tsx`:
     - Added click handling for avatars and names in both the Team Members sidebar roster and incoming chat message bubbles.
     - Rendered a floating popover anchored near the clicked profile with user preview, View Profile, Follow User (with live follow status check and toggle), Message (via `openDirectChat`), and Report User (triggering `ReportMemberModal`).
     - Added click-away backdrop and Escape key listener to cleanly dismiss the menu.
3. **Unified Contract & Members Tab**:
   - Created `ProjectContractAndMembersTab.tsx` combining `ProjectContractTab` and `ProjectMembersTab` features with a top sub-tab segmented control.
   - Updated `TeamProjectWorkspace.tsx` tab navigation from 6 tabs to 5 tabs with `Contract & Members` (`badge: members.length`).
   - Wired `searchParams.get('tab') === 'members'` to automatically activate the Members sub-tab.

## Verification
- Frontend: `cd frontend && npm run build` passed with zero TypeScript and bundler errors (`✓ built in 3.86s`).
- Preserved existing controller → service → repository separation and design guidelines.
