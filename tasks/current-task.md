# Active Task: Prevent canvas selection of inactive video clips

## Objective

Keep eagerly loaded videos mounted while excluding clips outside the playhead's time range from canvas selection, pointer events, selection controls, and purchase-badge targeting.

## Acceptance criteria

- [x] Sequence wrappers expose their active time-range state without unmounting video elements.
- [x] Inactive wrappers and descendants do not intercept canvas clicks.
- [x] Click and box selection recheck the live playhead; end time is exclusive.
- [x] Selection controls and purchase badges exclude inactive DOM targets.
- [x] Editor TypeScript check passes.

## Verification

Editor TypeScript and diff whitespace checks passed. No test suites or live project mutations, following the user's preference. Browser selection/playback behavior has not been exercised here.
