# Active Task: Correct caption word timing in exports

## Objective

Make caption words advance from upcoming to active to appeared at the actual composition frame rate, in the renderer and editor, while retaining lazy mounting.

## Acceptance criteria

- Caption words use the actual composition FPS rather than a fixed 30 FPS.
- Active word ranges include their start and exclude their end.
- Word timing retains the parent-supplied frame and timestamp offset for moved captions and nested scenes.
- Verify timing at multiple frame rates; both packages compile and the renderer bundle builds.

## Finding

Both CaptionWord implementations hardcoded 30 FPS for timestamp conversion while receiving frames at the project's/export's actual FPS. At 60 FPS, later captions could already classify all their words as appeared when mounted.

## Verification

Rendered CaptionWord markup correctly changed upcoming/active/appeared colors at 24, 30, and 60 FPS, including nonzero timestamp offsets and backward seeks. Both TypeScript checks and the renderer bundle build passed. No paid exports or deployments were run; Lambda still requires deploying the updated bundle.
