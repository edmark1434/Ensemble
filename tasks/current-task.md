# Active Task: Make Workspace Task Statuses Automatic Where Required

## Implementation Objective

Remove Complete and Overdue from the editable task status menu. Completed remains sourced from the task’s server-managed status. Overdue is derived in the editor API from the task deadline or its current milestone deadline.

## Acceptance Criteria

- Complete and Overdue are not accepted as manual status updates by the editor API.
- Tasks are automatically Overdue at or after their task due date or current milestone due date, unless their task status is completed.

## Implementation Status

- Complete and Overdue were removed from editable status options. Overdue now includes the current milestone deadline. The editor update route rejects manual attempts to set automatic statuses.
