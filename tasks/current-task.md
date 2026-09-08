# Current Task — Moderation activity log + report release fix

1. Fix Reverse action on Admin Moderation recent activity.
2. Drive Moderation activity feed from `account_activity`; log admin/mod actions (status, warn, freeze, reports, disputes, listings).
3. Remove “Release case” from reports (disputes-only); unlock report reassignment messaging.
4. Allow Admin to be assigned on forum/marketplace/jobs report queues.

## Acceptance Criteria

- [x] Reverse works for reversible moderation activity rows.
- [x] Suspend/warn/etc. appear in Admin Moderation activity (via account_activity).
- [x] Reports UI no longer shows Release case; disputes keep it.
- [x] Admin can assign themselves / be assigned on forum reports.
