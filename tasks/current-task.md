# Current Task — Account activity system

Add `account_activity` table, write events from key moderation/account actions, expose APIs, and show feeds on Admin + designated moderator UIs.

## Acceptance Criteria

- [x] Migration creates `account_activity` (UUID PKs, polymorphic refs, actor, indexes).
- [x] Helper to insert activity; wire warn/pardon/restriction/status (+ related) writes.
- [x] Admin + moderator APIs list activity by account / recent feed.
- [x] UI surfaces on Admin user/team history and moderator restrictions desks.
