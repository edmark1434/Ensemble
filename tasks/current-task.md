# Active Task: Fix Team Taskboard, Video Projects Loading, and Invitation Approval Flow

## Implementation Objective

1. Fix task creation and saving errors in Team Taskboard by passing `teamId={team.team_id}` from `SelectedTeam.tsx` and adding defensive fallback handling in `TeamTaskboard.tsx`.
2. Fix infinite skeleton loading in Team Video Projects by passing `teamId={team.team_id}` from `SelectedTeam.tsx` and adding fallback resolution and proper loading termination in `TeamVideoProjectsTab.tsx`.
3. Fix team invitation flow so that invited users do NOT automatically appear in the active Members tab upon invitation. Instead, the invited user accepts the invitation to request to join (`status = 'Pending'`), which then appears in the team owner's Pending Requests tab for review and approval.

## Acceptance Criteria

- [x] `SelectedTeam.tsx`:
  - Pass `teamId={team.team_id}` to `<TeamTaskboard>` and `<TeamVideoProjectsTab>`.
  - Filter `members` in the Members tab and header member count to only display active members (`status === 'Active' || !status`).
- [x] `TeamTaskboard.tsx`:
  - Accept `team?: any` in props and compute `effectiveTeamId = teamId || team?.team_id || team?.id || ""`.
  - Guard `fetchTasks` with `if (!effectiveTeamId) return;`.
- [x] `TeamVideoProjectsTab.tsx`:
  - Accept `team?: any` in props and compute `effectiveTeamId = teamId || team?.team_id || team?.id || ""`.
  - Ensure `fetchProjects` runs on `effectiveTeamId` and `setLoading(false)` terminates even if no teamId is provided.
- [x] `backend/services/TeamsServices.js`:
  - In `members(id, a, statuses)`: default to `['Active']` when `statuses` is omitted; return `['Active', 'Suspended', 'Invited']` only when `status=all` or explicitly requested by authorized managers.
  - In `invitation(id, a, accept)`: when accepted, transition status to `'Pending'` (awaiting approval) and notify team owners, rather than immediately setting status to `'Active'`.
- [x] `InviteTeamModal.tsx`:
  - Pass `{ params: { status: 'all' } }` when fetching members so it can accurately check if searched users are already invited or active.
- [x] `TeamInvitePage.tsx`:
  - Display "Accept Invitation & Request to Join" and update success message to reflect request submission for admin approval.
