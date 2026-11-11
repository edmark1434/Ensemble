# Active Task: Reorganize admin nav (Moderation / Settings)

## Implementation Objective

Remove the duplicate Reports sidebar item. Move Warnings & punishments into Moderation as a polished Policy area. Move Badges under System Settings.

## Acceptance Criteria

- [x] Admin sidebar no longer lists Reports, Badges, or Warnings & punishments as top-level items.
- [x] Reports remain reachable only via Moderation → Pending cases → Reports.
- [x] Warnings library, punishments, and thresholds live inside Moderation with a professional Policy UI.
- [x] Badges live under System Settings (Catalog / Grant).
- [x] Old `/admin/warnings` and `/admin/badges` URLs redirect cleanly.
- [x] Frontend typecheck passes.
