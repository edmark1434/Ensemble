# Current Task — Single-editor Settings pattern

Settings tabs own editing; operational Admin pages show status + links.

## Scope

1. **Moderation:** Settings → Moderation = editor; Moderation → Automod = status only. Security stays separate.
2. **Economy:** Settings → Economy = editor; Credits & Economy → Management (packages / fees / marketplace) = status only.

## Acceptance Criteria

- [x] Automod is read-only status with CTA to Settings → Moderation (+ Security link).
- [x] Credit Economy Management sections are read-only status with CTA to Settings → Economy.
- [x] Settings Moderation / Economy / Security cards link across related surfaces.
- [x] Settings → Economy can add/remove packages (moved from Credit Economy editor).
- [x] No duplicate save forms for the same `configuration` keys.
