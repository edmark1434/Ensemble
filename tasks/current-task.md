# Active Task: Timeline price badge layering

## Implementation Objective

Render timeline item price badges behind the playhead line.

## Acceptance Criteria

- Price badges remain above timeline items and below the playhead.
- Preserve badge appearance, positioning and purchase behavior.
- Do not run builds, type checks, lint, tests or other verification commands.

## Implementation Status

- Lowered the price-badge overlay from z-index 20 to 5, below the playhead's existing z-index 10.
- No verification commands run.
