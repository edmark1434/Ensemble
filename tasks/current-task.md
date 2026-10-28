# Active Task: Temporary warnings + balanced band limits

## Implementation Objective

Staff/admin warnings are always temporary. Points 1–10 set both the merit hit (×2) and duration (3–90 days). 5 points is a minor 14-day Watch slap. Low merit automatically limits forums, marketplace, jobs/gigs, and new shared editor projects. Live work stays open.

## Acceptance Criteria

- [x] Warnings cannot be permanent. Duration follows the point ladder; staff may shorten, never lengthen past the cap.
- [x] 1pt = −2 / 3 days; 5pt = −10 / 14 days; 10pt = −20 / 90 days.
- [x] Watch = minor; Restricted = forum + listing + comment + new shared editor lock; Frozen = those plus proposals, new DMs, cashout.
- [x] Expired warnings lapse on next session and recompute merit.
- [x] Auto-suspend at 20+ active warning points (7 days), not at 3 tiny warnings.
