# Active Task: Remove remaining Automod settings

## Implementation Objective

Remove Spam filter, Auto-flag profanity, and Active warning points before auto-suspend from admin Automod/settings. Disable spam/profanity blocking. Keep auto-suspend driven only by warning thresholds (`/admin/warnings`), not a separate Automod number.

## Acceptance Criteria

- [x] Settings removed from defaults, UI, types, and moderation status panels.
- [x] Forum spam/profanity automod no longer blocks posts.
- [x] Auto-suspend uses warning thresholds only.
- [x] Frontend typecheck passes.
