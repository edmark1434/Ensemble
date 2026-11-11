# Active Task: Honor maxWarningsBeforeSuspend as configured

## Implementation Objective

Stop treating moderation.maxWarningsBeforeSuspend values under 10 as 20. Use the admin-configured number as the real auto-suspend trigger threshold.

## Acceptance Criteria

- [x] Configured value (including under 10) is used as the suspend gate.
- [x] Admin UI allows values from 1–50.
- [x] Field meta/description no longer says under-10 values become 20.
- [x] Frontend typecheck passes.
