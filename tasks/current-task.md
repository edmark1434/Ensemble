# Active Task: Fix Workspace Subcontractor Taskboard Crash & Project Info Rich Text

## Implementation Objective

1. Fix the uncaught `ReferenceError: ShieldCheck is not defined` crash in `ProjectTaskboardTab.tsx` that caused a complete black screen when a subcontractor accessed the taskboard tab.
2. Render rich text markdown for `project.project_description` in `ProjectInfoTab.tsx` using `JobRichText` so formatting (bold, headers, lists) is rendered instead of literal asterisks.

## Acceptance Criteria

- [x] In [`ProjectTaskboardTab.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/3_teams/team_project/ProjectTaskboardTab.tsx), imported `ShieldCheck` from `lucide-react` for the Scoped Subcontractor Access Banner.
- [x] In [`ProjectInfoTab.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/3_teams/team_project/ProjectInfoTab.tsx), wrapped `project.project_description` in `<JobRichText />` so markdown formatting displays as styled rich text.
