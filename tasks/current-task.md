# Active Task: Link reported content on staff report desks

## Implementation Objective

Whenever a member files a report, store a snapshot of the reported item and give staff a live platform-view link when one exists. If the item is private, deleted, or otherwise not linkable, show the snapshot inline.

## Acceptance Criteria

- [x] `reports.subject_snapshot` stores kind, title, body preview, and href at submit time.
- [x] Jobs, gigs, assets, profiles, forums, teams, team projects, and inbox reports capture that snapshot.
- [x] Staff report detail shows an Open link through platform view when the item is still reachable.
- [x] Chat messages and missing/deleted items show the captured preview instead of a dead link.
- [x] Docs describe the subject contract.
