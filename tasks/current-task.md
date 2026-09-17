# Current Task — Team Invite Modal, Discord-Style Invite Page, Button Hover Effects, and Cover Photo Cleanup

1. Remove the "Add Fund" button from beside the message button on the team cover photo (keep it in the Wallet tab).
2. Add hover effects across all buttons in the team tabs to make them feel interactive and clickable.
3. Replace the browser prompt in "Invite Member" with a dedicated modal (`InviteTeamModal.tsx`) that generates and copies a shareable team invite URL and join code.
4. Implement a Discord-style public/join invite landing page (`TeamInvitePage.tsx`) showing team details, avatar, member count, and join action (redirecting to login if unauthenticated).

## Acceptance Criteria

- [x] Remove "Add Fund" button from cover photo actions in `SelectedTeam.tsx`.
- [x] Add consistent hover and active feedback (`cursor-pointer`, `transition`, `hover:...`, `active:scale-[0.98]`) to all buttons across Team tabs and actions.
- [x] Add backend public endpoint `GET /api/teams/invite/:code` returning team preview info.
- [x] Add invite paths `/teams/join/:joinCode` and `/teams/invite/:joinCode` to `guestRouteAccess.ts`.
- [x] Create `InviteTeamModal.tsx` in `frontend/src/pages/user/3_teams/team_modals/` with shareable URL generation and copy actions.
- [x] Create `TeamInvitePage.tsx` with Discord-style team preview card, member count, and authenticated/guest join actions.
- [x] Register invite routes in `App.tsx` and ensure `Loginpage.tsx` honors `redirect` parameter.
- [x] Wire up `InviteTeamModal` in `SelectedTeam.tsx` when clicking "Invite Member".
- [x] Verify backend invite endpoint with test script.
- [x] Verify frontend build completes without errors (`npm run build`).

Status: Completed
