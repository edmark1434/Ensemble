# Active Task: Audit and fix the report, merit and punishment systems

## Implementation Objective

Find and fix the gaps in member reports, staff report decisions, warnings/merit and standing
punishments so they work end to end for members, specialist moderators, Support and Admin.

## Acceptance Criteria

Reports
- [x] Filing a report no longer fails with a 500 after saving (undefined `ticketAutoCreated`).
- [x] Gig reports resolve the reporter from the JWT (the route has no `checkSession`).
- [x] Technical-problem reports (and any report whose target is the reporter) cannot be sanctioned.
- [x] Team member reports only accept accounts with a membership on that team.
- [x] A member cannot hold two open reports on the same item (409); technical reports exempt.
- [x] Generic report PATCH validates status/priority; Sanctioned/Denied are final and only set
      by a decision; claiming is guarded in SQL.
- [x] Report sanctions can use a named warning (desk-checked); default stays Staff follow-up.
- [x] Restricted/Frozen bands no longer block forum reports (only a forum timeout does).
- [x] Forum report details capped at 2,000 characters like every other report.
- [x] Staff report modal reads the reported account from `subject`, hides Ban from roles that
      cannot ban, hides Sanction on technical reports, and offers the warning picker.

Warnings / punishment
- [x] Named warnings are desk-checked when issued, not only in the picker.
- [x] Warnings are refused on team and staff accounts (they have no Platform Merit).
- [x] A warning issued after a denied appeal (`ACCOUNT_WARNED`) re-opens appealing.
- [x] Owner Record activity includes `ACCOUNT_WARNED` and `ACCOUNT_PARDONED`.
- [x] Auto-suspend sends one notice, not two.
- [x] Lifting a penalty (expiry, unban/unsuspend/unlock/restore, pardon) on a deactivated member
      returns it to Deactivated instead of Active.

Merit
- [x] Rescinding a warning notifies the member with their new merit.
- [x] Expired warnings announce a merit band change.
- [x] Owner Record uses the backend merit; staff merit sums match the backend rule.

- [ ] Typecheck (user runs `pnpm typecheck`).
- [ ] Backend restarted.

---

# Parallel Task (separate session): Standing indicator, credit holds, deactivation cooldown

## Implementation Objective

Members always see when they are Suspended, in Frozen access, have credits on hold, or are
timed out: what is paused, when it ends, and how to get back to normal (wait, or appeal).
Credit holds become explained, dated, appealable and race-safe. Members can deactivate
(hidden from every member, staff bypass), reactivate after 72 hours, and deactivate again
only after a 7-day cooldown.

## Acceptance Criteria

- [x] `getAccountAccess` returns credit-hold details, ban/lock end times and `warningBandEndsAt`.
- [x] Site-wide status bar + "How to fix" sheet; same list on the appeal page and the wallet.
- [x] Freeze needs a reason, may set an end date, locks the wallet row, notifies the member.
- [x] Expired holds are released by the one-minute job; accepted appeals end holds within 24h.
- [x] A credit hold is an appealable penalty; reversing `CREDITS_FROZEN` uses the safe release.
- [x] Reversing a status change cannot overwrite a newer status, and restores the old clock.
- [x] Deactivation: 7-day re-deactivation cooldown; blocked by live contracts, unsigned offers or
      open disputes; activity logged; hidden while penalised; sign out from the deactivated screen.
- [x] No follow, DM, proposal, offer or gig order to a deactivated member; their jobs/gigs leave browse.
- [x] `/api/accounts/dev/*` refuses to run in production.
- [ ] Migration `1828400000000_credit-holds-and-deactivation-cooldown` applied before restart.
- [ ] Typecheck (user runs `pnpm typecheck`).
- [ ] Backend restarted.
