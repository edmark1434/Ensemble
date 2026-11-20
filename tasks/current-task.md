# Current Task

## Objective

1. Restore transition drop targets between adjacent clips placed on reused timeline lanes (after add, paste, duplicate, scene add, and playhead edits).
2. Investigate and fix intermittent black-media-after-transition playback issues.
3. Merge stacked presence playhead labels into a single `Name and N others` badge whenever 3+ names stack vertically at the current zoom level, separating them again as the user zooms in.

## Acceptance Criteria

- Adding, pasting, duplicating, or extending/moving items adjacent to another item on a reused lane creates/preserves `kind: "none"` transition drop slots in `stateManager`, Yjs, and the timeline canvas so transitions can be dropped between them immediately.
- `groupTrackItems` ignores `kind: "none"` placeholders (and orphaned transitions) when deciding transition chain heads so clips after an active transition never silently disappear to black, and `<TransitionSeries>` uses integer `from` and even `durationInFrames` (>= 2) to prevent fractional-frame midpoint handoffs.
- Outbound export and thumbnail payloads strip `kind: "none"` and orphaned transitions (recursively into nested scenes) before posting to the render server.
- `PresencePlayheads` clusters overlapping playhead badges by current screen pixel span (zoom-aware), stacks up to 2 overlapping labels vertically, and merges clusters that reach 3+ stacked rows into a single `{name} and {n} others` pill while keeping individual vertical lines.
