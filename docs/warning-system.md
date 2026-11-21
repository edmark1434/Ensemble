# Ensemble Warning System

This is the contract for conduct. **Stars** answer “was the work good?” **Warnings** answer “did they break the rules?” **Standing** (timeout / suspend / lock / ban) is the staff override for serious cases.

Automatic punishments start when **active warning points** take Platform Merit down to a threshold, and then run a **fixed number of days**. Stars stay for quality.

Users never see “warning points.” They see **Platform Merit** = `100 − active warning points`, derived and not stored. User-facing contract: [merit-system.md](merit-system.md).

You cannot buy your way out with credits, Premium, or Business.

---

## Contents

1. [60-second version](#1-60-second-version)
2. [What is live vs next](#2-what-is-live-vs-next)
3. [Who this applies to](#3-who-this-applies-to)
4. [How a warning is issued](#4-how-a-warning-is-issued)
5. [Points and duration](#5-points-and-duration)
6. [Named catalog](#6-named-catalog)
7. [Active points](#7-active-points)
8. [Automatic punishment ladder](#8-automatic-punishment-ladder)
9. [What each auto band locks](#9-what-each-auto-band-locks)
10. [Staff standing (manual)](#10-staff-standing-manual)
11. [Enforcement order](#11-enforcement-order)
12. [Rescind, expire, pardon, appeal](#12-rescind-expire-pardon-appeal)
13. [Who can warn](#13-who-can-warn)
14. [Visibility](#14-visibility)
15. [Live work](#15-live-work)
16. [Worked examples](#16-worked-examples)
17. [Data, APIs, files](#17-data-apis-files)
18. [Balance rules](#18-balance-rules)

---

## 1. 60-second version

```
Staff pick a named warning. Points and duration are locked to that row. Case notes are free text.

That warning is always temporary. How long it lasts is set when admin creates the warning.

Active points = sum of unexpired, unrescinded warning points. Merit = 100 − active points.

When a new warning takes merit down to a rule's level, that rule's punishment starts and runs
for its own number of days (admin CRUD, seeded as):
  merit 60 or lower   Limited         1 day
  merit 55 or lower   Mute            1 day
  merit 50 or lower   Mute            2 days
  merit 45 or lower   Restricted      2 days
  merit 40 or lower   Frozen access   3 days
  merit 30 or lower   Auto-suspend    3 days
  merit 20 or lower   Auto-suspend    7 days

Nothing automatic happens above merit 60: ordinary warnings are only on the
record. Automatic punishments need many active warnings piled up.

It runs its full time. A warning expiring, staff lifting points, or merit recovering does NOT
end it, and the punishment never changes merit. Dropping further crosses harsher rules, so
punishments add up. Each rule starts once per drop past it.

Staff can still timeout / suspend / lock / ban on top.
The engine never auto-bans, never seizes the wallet, never cancels live work.
```

## 2. What is live vs next

### Live now

- Named warnings. Staff cannot type a custom point value or duration.
- Catalog in `warning_defs` (admin CRUD at `/admin/warnings`). Seed/fallback in `backend/lib/WarningCatalog.js`.
- Points 1–10. Duration 1–365 days is set on the catalog row. Always expires. Staff cannot change the clock when issuing.
- Issued row is a `violations` record. Catalog edits do not rewrite old cases.
- Active points stack into Platform Merit. Crossing a rule in §8 (`warning_thresholds`, admin CRUD on the same page) starts a **timed punishment** (`merit_penalties`).
- Seeded auto-suspend: **merit 30 → 3 days**, **merit 20 → 7 days**. A suspension already running is extended when the new one ends later, never shortened. Bans and locks are never overwritten.
- Lapsed warnings are marked `expired` on the next account-access pass and by the one-minute sweep: merit recovers, punishments keep running.
- Rescind one row (ends the punishments that warning started). Pardon clears all warnings and ends every punishment. Appeal is per penalty.
- Product limits come from the strictest running band punishment, not from the live point total.

---

## 3. Who this applies to

| Actor | Warnings | Notes |
|---|---|---|
| Guest | No | Browse only. |
| User account (enthusiast / freelancer / client — same account) | Yes | One point total covers every role. |
| Team account | No user ring | The **acting user** is checked. A Restricted member cannot post a team job. A team can still be suspended/locked/banned as an account. A warning staff aim at a team is issued to its **leader** (active Owner) and listed on the team's record ([punishment-system.md](punishment-system.md) §8.10). |
| Staff | No | Staff `performanceScore` is workload, not this system. |

New users start with **0 active points** and full access. Being new is not a crime.

---

## 4. How a warning is issued

1. Staff open a desk (Admin User & Team, a moderator console's User & Team or Restrictions desk, or a report case).
2. They pick a **named warning**. The picker loads `/api/admin/warning-catalog` or `/api/moderator/warning-catalog`.
3. Points and duration are locked to that row.
4. They write **case notes** (required). That is what happened on this case, not a custom score.
5. Backend resolves the row from `warning_defs` (fallback: hardcoded seed). Client-sent points and duration are ignored. The row must be on the issuer's desk (`desks`), checked on the server, not just in the picker: Admin and Support may issue every row; a specialist moderator gets 403 for rows outside their desk. Teams and staff have no Platform Merit. A warning on a team account is issued to the team's leader instead (`violations.team_account_id` names the team; 409 `TEAM_NO_LEADER` when it has none); staff accounts are refused (400 `WARNING_MEMBER_ONLY`).
6. A `violations` row is inserted: `status = active`, `points` copied, `expires_at` set from the catalog duration.
7. Activity log `ACCOUNT_WARNED`. User is notified (`account:warning`).
8. Active points pick the §8 threshold. Auto-suspend rows fire once per crossing.

Permanent warnings are rejected. Client `duration: 'permanent'` or a custom `days`/`endsAt` is ignored.

Ticket/report “staff follow-up” maps to `staff_follow_up` (3 points) when no named row fits.

### 4a. Automatic warning: missed contract review

A contract stays `Done` until both parties review each other (then `Completed`). Each **member** party has **24 hours** from `contracts.ended_at` to review the other party.

1. With 6 hours or less left, the party gets one reminder notification (`CONTRACT_REVIEW_REMINDER`, links to the contract). Contracts that ended more than 14 days ago are never reminded.
2. After the deadline, and at least 6 hours after the reminder, the system issues the `missed_review` catalog row (seeded 2 points, 5 days) with no staff author (`violations.staff_id IS NULL`). It then runs the same path as a staff warning: activity `ACCOUNT_WARNED`, `account:warning`, §8 punishments.
3. Each party is reminded and warned at most once per contract (`contract_review_obligations`). Team accounts and contracts with an open dispute are skipped. Hiding the `missed_review` row at `/admin/warnings` turns these warnings off; editing it changes points and duration.

Hourly job at :50 (`reconcileMissedReviews` in `MissedReviewServices`, queries in `MissedReviewRepositories`). Staff rescind it like any warning.

---

## 5. Points and duration

Each **issued** warning has its own clock, copied from `warning_defs.duration_days` at issue time. The automatic threshold uses the **sum** of those still active.

Admin sets duration when creating or editing the named warning (1–365 days). Seeded rows use 3 / 5 / 7 / 10 / 14 / 21 / 30 / 45 / 60 / 90 days by points. Custom rows can pick any length in that range.

Staff cannot shorten, lengthen, or make a warning permanent.

---

## 6. Named catalog

Admin creates, edits, and hides rows at **`/admin/warnings`**. Seeded list below. Changing points on a catalog row only affects **new** warnings.

Severe crime (CSAM, payment theft in progress) is **lock or ban**, not “just a warning.” The 10-point rows exist so the record stays if the account is later restored.

| Warning | Points | Duration | Category | Desks |
|---|---|---|---|---|
| Off-topic or low-effort flood | 1 | 3d | Forums | admin, support, forum |
| Offensive language | 2 | 5d | Conduct | all |
| Unsolicited spam messages | 2 | 5d | Inbox | all |
| Repeated forum spam | 3 | 7d | Forums | admin, support, forum |
| Inappropriate content | 3 | 7d | Conduct | all |
| Duplicate or spam job post | 3 | 7d | Jobs | admin, support, jobs |
| Duplicate or spam gig | 3 | 7d | Gigs | admin, support, jobs |
| Spam marketplace listing | 3 | 7d | Marketplace | admin, support, marketplace |
| Inappropriate profile content | 3 | 7d | Identity | admin, support |
| Staff follow-up warning | 3 | 7d | Other | all |
| Other (minor) | 3 | 7d | Other | all |
| Copyrighted material in forums | 5 | 14d | Forums | admin, support, forum |
| Harassment or bullying | 5 | 14d | Conduct | all |
| Harassment in chat | 5 | 14d | Inbox | all |
| Harassment of team members | 5 | 14d | Teams | admin, support, forum, jobs |
| Harassment in a project | 5 | 14d | Editor | admin, support |
| Misleading job details | 5 | 14d | Jobs | admin, support, jobs |
| No-show / ghosting after hire | 5 | 14d | Jobs | admin, support, jobs |
| Misleading gig or bait-and-switch | 5 | 14d | Gigs | admin, support, jobs |
| Misleading listing | 5 | 14d | Marketplace | admin, support, marketplace |
| Fake team | 5 | 14d | Teams | admin, support, jobs |
| Copyrighted team content | 5 | 14d | Teams | admin, support, jobs |
| Abuse of the dispute process | 5 | 14d | Money | admin, support, jobs, marketplace |
| Other (moderate) | 5 | 14d | Other | all |
| Job fee evasion | 6 | 21d | Jobs | admin, support, jobs |
| Review manipulation | 6 | 21d | Jobs | admin, support, jobs |
| No review after a finished contract | 2 | 5d | Jobs | admin, support, jobs — issued automatically (§4a) |
| Marketplace fee evasion | 6 | 21d | Marketplace | admin, support, marketplace |
| Copyright infringement (listing) | 7 | 30d | Marketplace | admin, support, marketplace |
| Hate speech | 8 | 45d | Conduct | all |
| Sharing private information | 8 | 45d | Conduct | all |
| Scam or phishing in chat | 8 | 45d | Inbox | all |
| Fake job or scam offer | 8 | 45d | Jobs | admin, support, jobs |
| Fake delivery or empty work | 8 | 45d | Jobs | admin, support, jobs |
| Stolen gig media | 8 | 45d | Gigs | admin, support, jobs |
| Fake gig delivery | 8 | 45d | Gigs | admin, support, jobs |
| Stolen or unauthorized asset | 8 | 45d | Marketplace | admin, support, marketplace |
| Impersonation | 8 | 45d | Identity | all |
| Refund or chargeback abuse | 8 | 45d | Money | admin, support, jobs, marketplace |
| Other (serious) | 8 | 45d | Other | all |
| Threats or violence | 10 | 90d | Conduct | all — also suspend/ban |
| Malware or harmful file | 10 | 90d | Marketplace | admin, support, marketplace — unpublish |
| Harmful file in the editor | 10 | 90d | Editor | admin, support |
| Fraudulent identity documents | 10 | 90d | Identity | admin, support — also lock |
| Payment fraud | 10 | 90d | Money | admin, support — also ban |

`all` = admin, support, forum, marketplace, jobs.

---

## 7. Active points

```
active points =
  SUM(LEAST(GREATEST(points, 1), 10))
  FROM violations
  WHERE not deleted
    AND status in (active, open, pending)
    AND (expires_at is null OR expires_at > now())
```

Rescinded, expired, pardoned, reversed, and deleted rows do not count.

Points **stack**. Two 5-point warnings = **10** until the first one expires.

Merit is recalculated from leftover points after expire, rescind, lift, or pardon. Running punishments are not: they keep their own clock (§8).

---

## 8. Automatic punishment ladder

Admin CRUD is at `/admin/warnings` → Merit punishments. Each row: **when Platform Merit drops to this level (or lower), apply this punishment for N days.** Seeded rows:

| Merit drops to | Active points | Punishment | How long |
|---|---|---|---|
| **60** | 40+ | **Limited** | 1 day |
| **55** | 45+ | **Mute** | 1 day |
| **50** | 50+ | **Mute** | 2 days |
| **45** | 55+ | **Restricted** | 2 days |
| **40** | 60+ | **Frozen access** | 3 days |
| **30** | 70+ | **Auto-suspend** | 3 days |
| **20** | 80+ | **Auto-suspend** | 7 days |

Seed history: the first seed started at merit 97 (`1829300000000`), the second at 95 (`1829600000000`, shorter lengths). `1829700000000_merit-punishments-start-at-60` moved it to 60. Each migration only replaces seeded rows nobody edited. The last one also ended running punishments from seeded rules that the new ladder would not give at the member's current merit (`end_reason = 'rebalanced'`) and released automatic suspensions left without a record; members are told by the sweeps.

**When it starts.** A rule starts when a new warning takes the member from above its level to at or below it ("once per drop"). The engine works this out from the warning's own place in time (active points from warnings issued before it, plus its weight), so two warnings issued together cannot hide a crossing. One warning can cross several rules; per punishment type the longest one starts. A member who recovers above a level and drops past it again gets that punishment again.

**How long it lasts.** A fixed clock from the moment it starts (`merit_penalties.ends_at`). Warnings expiring, staff lifting points, or merit recovering do **not** end it early, and nothing about it changes merit. Rule edits only affect punishments that start afterwards, the same way a warning keeps its catalog clock.

**How they add up.** Different punishments run side by side (a Restricted band and a Mute can both be running). Of the same type, the one that ends last decides when that type ends: a new one never shortens a longer one already running. Product checks use the **strictest running band** (Frozen > Restricted > Limited); when it ends, a milder band still running takes over.

**Mute** pauses forum posts, comments, reactions and new groups (reporting stays open), marketplace comments, and new conversations. Existing job, gig and contract threads stay open.

**Auto-suspend** sets the account to Suspended for the rule's days (`accounts.suspension_source = 'auto'`). A suspension already running is extended when the new one ends later and left alone otherwise; bans and locks are never overwritten. It ends on its clock (standing sweep), or when staff unsuspend / change the standing (which also closes its record).

**What ends a punishment early:** staff **Unfreeze** / **End early** (Admin / Support, staff-only reason, member notified; see §12), a pardon (all of them), an accepted appeal on it (within 24 hours, now, or an earlier date), or rescinding / reversing the warning that started it (only that warning's punishments, including an automatic suspension it caused). Expired punishments are closed by the one-minute sweep, which tells the member and what is still running.

Lock and ban stay **staff-only**.

## 9. What each auto band locks

Standing (timeout / suspend / lock / ban) is checked first. If standing already blocks the action, stop. Otherwise use this table.

Legend: **OK** = allowed. **NO** = blocked.

Each column is a running punishment (seeded at merit 60 / 45 / 40), not a point range. Mute is its own column.

| Action | Limited | Restricted | Frozen access | Mute |
|---|---|---|---|---|
| Browse the site | OK | OK | OK | OK |
| Post a normal job | OK | **NO** | **NO** | OK |
| Post an urgent job | **NO** | **NO** | **NO** | OK |
| Create a gig | OK | **NO** | **NO** | OK |
| Send a proposal | OK | 3 per UTC day | **NO** | OK |
| Publish a marketplace listing | Review queue | **NO** | **NO** | OK |
| Comment on an asset | OK | **NO** | **NO** | **NO** |
| Write forums (post / comment / react / new group) | OK | **NO** | **NO** | **NO** |
| Read forums | OK | OK | OK | OK |
| New DM / new inbox group | OK | OK | **NO** | **NO** |
| Message existing job / gig / contract thread | OK | OK | OK | OK |
| Create a team | OK | **NO** | **NO** | OK |
| Accept a new team invite | OK | **NO** | **NO** | OK |
| Existing team membership | OK | OK | OK | OK |
| New shared / team editor project | OK | **NO** | **NO** | OK |
| Personal editor projects | OK | OK | OK | OK |
| Cash out | OK | OK | **NO** (balance not seized) | OK |
| Buy credits / subscribe | OK | OK | OK | OK |
| Finish a live contract or gig order | OK | OK | OK | OK |
| Tickets / appeals / disputes on existing work | OK | OK | OK | OK |
| Discovery ranking | Buried (specified) | Hidden from featured (specified) | Removed (specified) | — |

Forum writes during Restricted, Frozen access or a Mute are refused by `rejectForumTimeout` with `403 WARNING_RESTRICTED` (reports stay open); mute also stops forum socket writes. Marketplace comments and new conversations during a Mute are refused by `assertWarningAllows`. The forum pages read `user.restriction.warningBand` / `muted` through `useForumTimeout` and switch their write controls off up front ("Muted" or "Low merit" lock), with the date posting comes back.

Existing open jobs, gigs, and listings are **not** auto-deleted.

During **auto-suspend**, treat them as Suspended: reads only. After it ends, any band or mute still running applies.

---

## 10. Staff standing (manual)

Warnings do not replace the punishment ladder. They feed it.

| Standing | What it does | Typical with warnings |
|---|---|---|
| Notice | Hold a listing, automod flag. Not a punishment. | Optional. |
| Warning | Points + duration + auto band. | Always the record. |
| Forum timeout | Cannot write `/api/forum*`. Other products stay. | Optional on top of a forum warning. |
| Suspend | Site-wide reads only. Manual 1–30 days typical. Auto 7 or 14. | 20+ points, or staff skip. |
| Lock | Investigation / compromised. Appeal only. | Fake ID, impersonation, malware. Outcome: warn, suspend, ban, or restore. |
| Ban | Temp or permanent. Appeal only. | Threats, payment fraud, dispute conviction. Staff pick a named ban; they may override duration. |

Staff may skip rungs for severe harm. Skipping does not add extra warning points unless they also issue a warning.

Ban, suspend, and timeout use `punishment_defs`. Admin CRUD sits next to the warning library at `/admin/warnings`. Staff must pick a named row and a reason. The catalog clock is the default; they can set a custom duration. Lock stays free-form (investigation). The engine still never auto-bans.

Forum timeout does not block jobs, gigs, marketplace, inbox, or editor.

---

## 11. Enforcement order

First match that blocks, wins.

1. Guest → browse only.
2. Deleted / deactivated → existing account-access rules.
3. Banned or locked → appeal allowlist only.
4. Suspended → reads only.
5. Forum timeout → blocks forum writes only.
6. **Active warning-point band** → §9.
7. Otherwise allow.

A Restricted user who is also suspended still cannot write. A Frozen-access user who is Active can still finish a live contract.

---

## 12. Rescind, expire, pardon, appeal

| Action | Who | Points / merit | Automatic punishments |
|---|---|---|---|
| Warning expires | System | that row drops out of the sum; merit recovers | **keep running** to their end |
| Rescind one warning | Staff who can warn | that row no longer counts; stays on the Record as rescinded | the ones **this warning started** end now (an automatic suspension it caused ends too); others keep running |
| Reverse a warning (Admin Moderation) | Admin | as rescind | as rescind |
| Lift points | Admin / Support | N points (or up to a target merit) come off active warnings, longest-lasting first, or off one chosen warning; a row lifted to 0 becomes `lifted`; rows stay on the Record | **keep running**; a later drop past a level starts it again |
| Unfreeze / End early | Admin / Support | unchanged | the chosen punishments (default: every running band and mute) end now; staff-only reason; suspensions end with Remove suspension instead |
| Pardon | Admin / Support | all warning hits cleared | **all** end |
| Appeal accepted on a punishment | Support / Admin | unchanged | it ends within 24 hours (or now / an earlier date) |
| Appeal denied | Support | unchanged | unchanged; 12-month hold on that penalty |

Expired warnings are marked `expired` when account access is rebuilt (`expireElapsedWarnings`) and by the one-minute `reconcileExpiredStandings` sweep. The member is told their merit recovered and that running punishments keep their end dates. The same sweep closes punishments whose clock ran out (`sweepElapsedMeritPenalties`).

**Ending notice.** Whatever ends an automatic punishment (time ran out, Unfreeze / End early, pardon, appeal, rescind / reverse, rule change), the member gets one notice (`notifyPunishmentsEnded`) saying why and what is still running. When Frozen access ends it leads with **"You're unfrozen"** (notification type `ACCOUNT_UNFROZEN`, green toast); other ends are `MERIT_LIMIT_ENDED`. Starts are `MERIT_LIMIT_STARTED`. Open tabs refresh their standing at the same time. A rescind always notifies the member with their new merit.

A lift lowers `violations.points` (what still counts) and keeps the issued value in `violations.points_original`, so the Record shows "3 of 8 lifted". Staff must write a reason (staff-only; the member never sees it). Activity `WARNING_POINTS_LIFTED`. The member is notified with their new merit. Nobody lifts on their own account; only Admin lifts on a staff account. The desks offer quick lifts per level ("Back above merit 55 · lift 3 → merit 56") and say plainly that running punishments are not ended by a lift.

## 13. Who can warn

| Role | Warn | Timeout | Suspend / lock | Ban / restore | Pardon | Catalog / threshold CRUD |
|---|---|---|---|---|---|---|
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |
| Support Moderator | Yes | Yes | Yes | Yes | Yes | No |
| Forum Moderator | Yes (forum + conduct rows) | Yes | Yes | No | No | No |
| Marketplace Moderator | Yes (marketplace + conduct rows) | No | Yes | No | No | No |
| Jobs N Gigs Moderator | Yes (jobs/gigs + conduct rows) | No | Yes | No | No | No |

Admin and Support see every catalog row. Other desks only see rows whose `desks` include them.

---

## 14. Visibility

**Public** profile / job / gig / asset chips: Banned, Suspended, Locked, Timeout, Under dispute, plus the Platform Merit ring. **Not** warning text, warning points, or the Limited/Restricted/Frozen-access band name.

**Owner Record:** Platform Merit with "Running now" (what is paused and until when), standing, each warning (type, merit taken, expiry, status), and each automatic punishment (what, started at which merit, when it ends or why it ended). The owner's profile merit ring shows the same running list.

**Merit tier** (everyone): Trusted 100, Good 80–99, Fair 61–79, Low 41–60, Very low 40 and below. The tier never names a punishment; only the owner and staff see what is running.

**Staff:** every place merit appears on a desk (Users list, history, profile, Restrictions desk, jobs and marketplace detail, ticket case file) shows the running automatic punishments next to it. Admin / Support **Unfreeze** from the Users list row menu ("Unfreeze (end automatic limits)"), or **Unfreeze all** / **End early** in the Automatic punishments panel (history modal and Restrictions desk).

**Never public:** case notes, staff names, case IDs, rescinded rows as if they were active.

Counterparties on a job/gig/contract see public chips only.

Stars stay on the profile. They are independent of this system.

---

## 15. Live work

When points or standing change, do not strand the other party or their credits.

| Situation | What happens |
|---|---|
| Open job, owner Restricted | Job stays. They cannot post a **new** one. |
| Live contract, party Restricted / Frozen access | They can still deliver. They cannot start new supply. |
| Live contract, party suspended | They cannot write. Other party can ticket/dispute. Staff may extend or cancel with escrow rules. |
| Live contract, party banned | Staff resolve via dispute/escrow. Ban does not silently keep money. |
| Published asset, creator Restricted | Listing stays until staff unpublish. They cannot publish a new one. |
| Personal editor, Frozen access | Personal projects stay. New shared/team projects blocked. |

---

## 16. Worked examples (seeded ladder)

**One, two, or a few warnings**  
Merit stays above 60. Nothing automatic happens; the warnings are on the record and merit recovers as they expire.

**Many warnings still active (40 points: four 10s, eight 5s …)**  
Merit 60: **Limited 1 day**.

**More on top (45 / 50)**  
Merit 55: **Mute 1 day**. Merit 50: **Mute 2 days**.

**55 / 60 points**  
Merit 45: **Restricted 2 days**. Merit 40: **Frozen access 3 days**.

**Then warnings expire**  
Merit recovers. Nothing that is running ends early; when Frozen access ends the member is told "You're unfrozen".

**70 / 80 points**  
Merit 30: **3-day auto-suspend**. Merit 20: **7-day auto-suspend** (extends a shorter one still running). Staff look at ban.

## 17. Data, APIs, files

### Tables

- `warning_defs` — named library: slug, label, category, points 1–10, duration_days 1–365, desks jsonb, note, is_system, sort_order, deleted_at. Migration `1826400000000_warning-defs` plus `1826600000000_warning-duration-and-thresholds`.
- `warning_thresholds` — the punishment ladder: min_points (merit = 100 − min_points), effect (`limited` / `restricted` / `frozen` / `mute` / `auto_suspend`), label, duration_days 1–365, note, is_system, deleted_at. One active row per (min_points, effect). Migration `1829300000000_timed-merit-punishments` added duration_days and `mute`, retired the `none` / `record` rows and dropped `suspend_days` / `lift_at_merit`.
- `merit_penalties` — punishments the engine started: account_id, warning_threshold_id, violation_id (the warning that crossed it), effect, label, min_points, points_at_start, duration_days, starts_at, ends_at, ended_at, end_reason (`expired` / `staff` / `pardoned` / `appeal` / `rescinded` / `reversed`), ended_by_staff_id, end_note. Running = `ended_at IS NULL AND ends_at > NOW()`. Unique per (violation_id, effect, min_points).
- `violations` — issued cases: type (label), reason, points (what still counts), points_original (set on the first lift), status (`active` … `rescinded` / `lifted` / `expired` / `pardoned`), staff_id (NULL for system warnings, §4a), expires_at.
- `contract_review_obligations` — per (contract_id, reviewer_account_id): reminded_at, warned_at, violation_id. Migration `1829800000000_missed-review-warnings`.
- `accounts.suspension_source` (`auto` for engine suspensions). `accounts.auto_suspend_lift_merit` was dropped with early recovery lifts.
- `punishment_defs` — named ban / suspend / timeout library. See [punishment-system.md](punishment-system.md) and [database.md](database.md).

### APIs

- `GET /api/admin/warning-catalog?desk=` and `GET /api/moderator/warning-catalog?desk=`
- `GET /api/admin/punishment-catalog?desk=&kind=` and `GET /api/moderator/punishment-catalog`
- `GET/POST /api/admin/warning-defs`, `PATCH/DELETE /api/admin/warning-defs/:warningDefId` `{ label, category, points, durationDays, desks, note }`
- `GET/POST /api/admin/warning-thresholds`, `PATCH/DELETE /api/admin/warning-thresholds/:thresholdId` `{ minPoints | triggerMerit, effect, label, durationDays, note }` (Admin only)
- `POST /api/admin/accounts/:accountId/warn` `{ warningId, reason }`
- `POST /api/admin/accounts/:accountId/warnings/:violationId/rescind`
- `GET /api/admin/accounts/:accountId/warnings/lift-preview` → points, merit, running punishments, quick-lift options per level, the ladder (Admin / Support)
- `POST /api/admin/accounts/:accountId/warnings/lift` `{ points | targetMerit, violationId?, reason }` (Admin / Support)
- `GET /api/admin/accounts/:accountId/merit-penalties` → `{ ready, active, history }` (every User & Team desk)
- `POST /api/admin/accounts/:accountId/merit-penalties/end` `{ reason, penaltyIds?, effects? }` — **Unfreeze**: end several running bands / mutes at once, default all (Admin / Support)
- `POST /api/admin/accounts/:accountId/merit-penalties/:penaltyId/end` `{ reason }` (Admin / Support; not for auto-suspend)
- Moderator Restrictions desks get `meritPenalties` (running, all accounts) with `GET .../restrictions`; `getAccountAccess` returns `muted`, `mutedUntil`, `meritPenalties`, and `warningBand` / `warningBandEndsAt` from the strictest running band
- Moderator restriction desks: `POST .../restrictions/violations` with the same `{ warningId, reason }`

### Code

- Catalog seed: `backend/lib/WarningCatalog.js`, `frontend/src/lib/warningCatalog.ts`
- Resolve + admin CRUD: `WarningDefServices` / `WarningDefRepositories` / `WarningDefControllers`
- Issue: `warnAccount`, `issueViolation`
- Duration: catalog `duration_days` via `warningExpiry` in `AccountRestriction.js` (staff-sent clocks ignored)
- Thresholds: `WarningThresholdServices` / `WarningThresholdRepositories`; ladder rules, `rulesCrossed`, `bandFromPenalties` and live cache in `WarningBands.js`
- Engine: `MeritPenaltyServices` / `MeritPenaltyRepositories` — `applyMeritPunishmentsForWarning` (both warn paths), `endMeritPenaltyEarly`, `endMeritPenaltiesForWarning` (rescind / reverse), `endAllMeritPenalties` (pardon), `closeAutoSuspensionRecords` (staff status change), `shortenMeritPenaltiesForAppeal`, `sweepElapsedMeritPenalties` (one-minute job)
- Active sum: `sumActiveWarningPoints` in `WarningBandRepositories.js`
- Lift points: `WarningLiftServices` / `WarningLiftRepositories`; UI `LiftWarningPointsPanel` and `MeritPenaltiesPanel` (Admin User & Team history, moderator Restrictions desk)
- Works before `1829300000000` is applied (`SchemaFeatures.meritPenaltiesReady`): bands then follow points live and rule edits explain they need the migration.
- Admin UI: `/admin/warnings`, warn picker `WarningPresetFields`
- Product limits: `backend/lib/WarningBands.js` `ACTION_ALLOW` and `MUTE_ACTIONS`, enforced by `WarningBandServices.assertWarningAllows` (and `rejectForumTimeout` for forum writes)

---

## 18. Balance rules

1. Use **active points**, not warning count. Three 1-point slaps must not suspend anyone.
2. **Warnings first.** Nothing automatic happens above merit 60; ordinary warnings only go on the record.
3. **Real lockdowns need a pile-up.** Restricted starts at merit 45, Frozen access at 40, suspensions at 30.
4. Auto-suspend is a **cooldown**, not a loop.
5. **Punishments are timed.** They start on a drop past a level and run their full days. Merit recovering never ends them; a deeper drop starts a harsher one.
6. Live work is sacred. Restricted and Frozen access never cancel an open contract, gig order, or existing team project.
7. No death spiral. Being Frozen, muted or suspended does not add points.
8. Staff always win. Manual timeout / suspend / lock / ban overrides the auto band, and staff can end an automatic punishment early.
9. Severe rows are “warn for the record, then staff lock/ban.” The engine never auto-bans.
10. Stars never throttle. Warning points never change a star rating.

When this file and the code disagree, fix the code or update this file in the same change.
