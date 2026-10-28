# Current Task: Team Video Projects Creation & Collaboration

## Objective
Enable Team Leaders to create video projects for their team, automatically sharing collaborative editing access with every active member of the team.
1. Strictly enforce that only the Team Leader (`Owner`) can create or delete video projects for the general team.
2. When created, the Team Leader is assigned the project `Owner` role in `project_members`, and every active team member is automatically added as an `Editor` collaborator.
3. Keep all active members synchronized so any newly joined or approved members automatically receive collaborative access to existing team video projects.
4. Provide a video project creation modal with resolution presets (16:9 Landscape, 9:16 Vertical/Shorts, 1:1 Square, 4:5 Portrait) and auto-open newly created projects in the video editor via handoff tokens.
5. Display team video project cards with preview thumbnails, aspect ratio, duration, last edited timestamps, and collaborator avatar stacks showing all active team members who share access.

## Acceptance Criteria
- [x] Database migration `1826300000000_create-team-video-projects.js` created and executed (`team_video_projects` table).
- [x] In `backend/repositories/TeamsRepositories.js`:
  - `createTeamVideoProject`: Creates project, links in `team_video_projects`, inserts leader as `Owner`, and automatically assigns all active members as `Editor` in `project_members`.
  - `listTeamVideoProjects`: Lists team video projects with CloudFront thumbnail URLs and collaborator details (display name, avatar, role).
  - `ensureTeamMembersHaveProjectAccess`: Ensures all active team members have collaborator access.
  - `deleteTeamVideoProject`: Unlinks video project from the team.
- [x] In `backend/services/TeamsServices.js`:
  - Restrict `createVideoProject` and `deleteVideoProject` to active Team Leaders (`role === 'Owner'`).
  - Automatically call `ensureTeamMembersHaveProjectAccess` upon member activation/join/invitation acceptance.
  - Assert merit permissions (`assertMeritAllows`) on team creation and team join.
- [x] In `backend/controllers/TeamsControllers.js` & `backend/routes/Teams.js`:
  - `GET /api/teams/:teamId/video-projects`
  - `POST /api/teams/:teamId/video-projects`
  - `DELETE /api/teams/:teamId/video-projects/:projectId`
- [x] In `frontend/src/pages/user/3_teams/SelectedTeam.tsx`:
  - Pass `isOwner`, `teamLeaderName`, and `teamName` to `TeamVideoProjectsTab`.
- [x] In `frontend/src/pages/user/3_teams/team_components/TeamVideoProjectsTab.tsx`:
  - Replaced user-level `/api/projects` call with `/api/teams/:teamId/video-projects`.
  - Added "+ New Video Project" modal with 4 resolution/aspect ratio presets (16:9, 9:16, 1:1, 4:5).
  - Protected creation so only Team Leader can create; non-leaders see an explanatory "Managed by Team Leader" indicator.
  - Automatically launches the created project in the video editor via handoff token.
  - Rendered collaborator avatar stacks showing active members sharing access.
- [x] Verification: `npm --prefix frontend run build` succeeded with 0 errors.
