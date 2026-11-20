# Retry an export after a portfolio clip fails

## Implementation Objective
Allow a project or portfolio export to start as soon as a previous portfolio export fails.

## Acceptance Criteria
- Late render progress cannot return a failed or removed local job to the active queue.
- The portfolio worker releases the specific render when it records a failure and retries unsuccessful cleanup.
- A queued or running export, or a completed export awaiting download, still holds its slot.
- The project editor displays the server's reason for an export conflict.
