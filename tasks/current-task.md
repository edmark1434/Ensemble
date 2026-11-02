# Active Task: Public dispute forum on profiles

## Objective

Show staff-made-public disputes on both the disputer and disputee profiles, and let anyone view/reply to that discussion like a forum thread.

## Acceptance Criteria

1. Profile payloads list visible disputes for accounts that are either filer or respondent.
2. Profile Performance UI shows a Public disputes entry for owners and visitors when any exist.
3. `/disputes/:id` loads the public discussion (parties + public messages) with live updates.
4. Any signed-in member can reply while the dispute is open and public; guests can read only.
5. `cd frontend && npm run build` passes.
