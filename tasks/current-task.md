# Current Task: Refactor Incoming Team Proposals View & Remove Team Proposals Tab

## Objective
Remove the unused "Team Proposals" navigation tab from proposals tabs, and redesign the incoming team job proposals page to replace the cluttered "Roster & Cart" view with intuitive Milestone Sub-Tabs and readable, polished candidate cards.

## Acceptance Criteria
- [x] Remove "Team Proposals" tab from `proposals_tabs.tsx`.
- [x] In `proposals_incoming_page.tsx`, replace the "Roster & Cart" view toggle with Milestone Sub-Tabs for jobs with milestones.
- [x] Add compact, sleek active milestone status strip showing role need, slots filled/open, and budget percentage.
- [x] Filter proposal cards by the selected milestone tab (or "All Roles").
- [x] Refactor proposal cards to be clean, highly readable, and comfortable on the eyes in both List and Grid views.
- [x] Include clear action buttons on each card: View Full Details, Chat / Interview, Shortlist toggle, and Accept / Hire candidate.
- [x] Verify frontend with `npm run build`.
- [x] Strictly do NOT git commit unless explicitly commanded by user.
