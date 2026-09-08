# Current Task — Connect Moderation Automod ↔ Settings

Align Moderation → Management → Automod with System Settings → Moderation (shared `configuration.moderation.*` keys). Wire settings into real enforcement where feasible. Explain how Automod vs Security relate.

## Acceptance Criteria

- [ ] Automod UI shows the full moderation settings set (same store as Settings → Moderation).
- [ ] Saving either UI updates the same `configuration` rows.
- [ ] Key flags actually affect backend behavior (not display-only).
- [ ] Clear in-UI link between Automod and Settings Moderation/Security.
