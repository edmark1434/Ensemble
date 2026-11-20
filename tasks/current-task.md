# Editor walkthrough controls

## Implementation objective

Restore first-time onboarding and let presenters replay the editor walkthrough on demand.

## Acceptance criteria

- The tour dialog has an outlined Skip tour button. Its inset progress bar sits 4px below the walkthrough label and step count, with 12px before the step title.
- Automatic editor and workspace walkthroughs use the existing per-account history.
- Shift+T opens the full tour from step one in an editable project, including after a skip or finish.
- Demo replays leave onboarding history alone. The shortcut stays out of the shortcuts modal and ignores text entry.
