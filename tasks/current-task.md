# Active Task: Restore marketplace listing moderation queue

## Implementation Objective

New asset uploads were going live as published immediately after automod
settings were removed. Restore the previous default so every new publish enters
pending moderator review first.

## Acceptance Criteria

- [x] Creating an asset with publish intent keeps `market_assets.status = draft`
      and queues `marketplace_listings.status = pending`.
- [x] Updating a draft asset to publish also queues for moderator approval.
- [x] Editing an already-published asset does not bounce it back to pending.
- [x] Restricted / frozen / lower Merit bands still cannot publish.
- [ ] Typecheck (user runs `pnpm typecheck`).
- [ ] Backend restarted so the create/update paths load.
