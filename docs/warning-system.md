# Ensemble Warning System

This is the contract for conduct. **Stars** answer “was the work good?” **Warnings** answer “did they break the rules?” **Standing** (timeout / suspend / lock / ban) is the staff override for serious cases.

Automatic product limits follow **active warning points**. Stars stay for quality.

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

Active points = sum of unexpired, unrescinded warning points.

Those points pick an automatic threshold (admin CRUD, seeded as):
  1–2   Record only
  3–7   Limited
  8–15  Restricted
  16–19 Frozen access
  20–29 Auto-suspend 7 days (once per crossing)
  30+   Auto-suspend 14 days (once per crossing)

Staff can still timeout / suspend / lock / ban on top.
The engine never auto-bans, never seizes the wallet, never cancels live work.

When the warning expires or is rescinded, points drop and the band lifts by itself.
```

Stars never lock products. A 5-star seller can still be Restricted if they have 8 active warning points.

---

## 2. What is live vs next

### Live now

- Named warnings. Staff cannot type a custom point value or duration.
- Catalog in `warning_defs` (admin CRUD at `/admin/warnings`). Seed/fallback in `backend/lib/WarningCatalog.js`.
- Points 1–10. Duration 1–365 days is set on the catalog row. Always expires. Staff cannot change the clock when issuing.
- Issued row is a `violations` record. Catalog edits do not rewrite old cases.
- Active points stack and pick the automatic threshold in §8 (`warning_thresholds`, admin CRUD on the same page).
- Seeded auto-suspend: **20+ → 7 days**, **30+ → 14 days**. Already-suspended accounts are not stacked. Admin can change those rows.
- Lapsed warnings marked `expired` on the next account-access pass; the band lifts by itself.
- Rescind one row. Pardon clears all. Appeal is standing (ban/lock/suspend), not a warning editor.
- Product limits are warning-point bands, not a 0–100 score.

---

## 3. Who this applies to

| Actor | Warnings | Notes |
|---|---|---|
| Guest | No | Browse only. |
| User account (enthusiast / freelancer / client — same account) | Yes | One point total covers every role. |
| Team account | No user ring | The **acting user** is checked. A Restricted member cannot post a team job. A team can still be locked/banned as an account. |
| Staff | No | Staff `performanceScore` is workload, not this system. |

New users start with **0 active points** and full access. Being new is not a crime.

---

## 4. How a warning is issued

1. Staff open a desk (Admin User & Team, Support, Forum, Marketplace, or Jobs restrictions).
2. They pick a **named warning**. The picker loads `/api/admin/warning-catalog` or `/api/moderator/warning-catalog`.
3. Points and duration are locked to that row.
4. They write **case notes** (required). That is what happened on this case, not a custom score.
5. Backend resolves the row from `warning_defs` (fallback: hardcoded seed). Client-sent points and duration are ignored.
6. A `violations` row is inserted: `status = active`, `points` copied, `expires_at` set from the catalog duration.
7. Activity log `ACCOUNT_WARNED`. User is notified (`account:warning`).
8. Active points pick the §8 threshold. Auto-suspend rows fire once per crossing.

Permanent warnings are rejected. Client `duration: 'permanent'` or a custom `days`/`endsAt` is ignored.

Ticket/report “staff follow-up” maps to `staff_follow_up` (3 points) when no named row fits.

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

The band is recalculated from leftover points after expire, rescind, or pardon. It is not a wallet.

---

## 8. Automatic punishment ladder

Product limits and auto-suspend follow `warning_thresholds`. Admin CRUD is at `/admin/warnings` → Point thresholds. Highest matching `min_points` wins. Seeded rows:

| Active points | Auto punishment | How long | Notes |
|---|---|---|---|
| **0** | None | — | Full access |
| **1–2** | Record only | Until those rows expire | Toast + private Record. Site fully usable. |
| **3–7** | **Limited** | Until points drop below 3 | Minor. A single 5-point warning lands here. |
| **8–15** | **Restricted** | Until points drop below 8 | Timeout-like across products. One 8-point warning, or two 5s. |
| **16–19** | **Frozen access** | Until points drop below 16 | Not a standing. Not a ban. |
| **20–29** | **Auto-suspend 7 days** | 7-day standing, **once per crossing** | Then leftover-point band. Live today. |
| **30+** | **Auto-suspend 14 days** | 14-day standing, **once per crossing** | Repeat pile-up. Still no auto-ban. |

**Once per crossing** means: hitting 20 suspends them. After 7 days the suspend lifts even if they still have 20 points. They then live in Frozen/Restricted until points expire. A **new** warning that puts them at 20+ (or 30+) again starts a new cooldown. Already-Suspended accounts are not stacked with another auto-suspend.

Lock and ban stay **staff-only**.

---

## 9. What each auto band locks

Standing (timeout / suspend / lock / ban) is checked first. If standing already blocks the action, stop. Otherwise use this table.

Legend: **OK** = allowed. **NO** = blocked.

| Action | Limited 3–7 | Restricted 8–15 | Frozen 16–19 |
|---|---|---|---|
| Browse the site | OK | OK | OK |
| Post a normal job | OK | **NO** | **NO** |
| Post an urgent job | **NO** | **NO** | **NO** |
| Create a gig | OK | **NO** | **NO** |
| Send a proposal | OK | 3 per UTC day | **NO** |
| Publish a marketplace listing | Review queue | **NO** | **NO** |
| Comment on an asset | OK | **NO** | **NO** |
| Write forums (post / comment / react / new group) | OK | **NO** | **NO** |
| Read forums | OK | OK | OK |
| New DM / new inbox group | OK | OK | **NO** |
| Message existing job / gig / contract thread | OK | OK | OK |
| Create a team | OK | **NO** | **NO** |
| Accept a new team invite | OK | **NO** | **NO** |
| Existing team membership | OK | OK | OK |
| New shared / team editor project | OK | **NO** | **NO** |
| Personal editor projects | OK | OK | OK |
| Cash out | OK | OK | **NO** (balance not seized) |
| Buy credits / subscribe | OK | OK | OK |
| Finish a live contract or gig order | OK | OK | OK |
| Tickets / appeals / disputes on existing work | OK | OK | OK |
| Discovery ranking | Buried (specified) | Hidden from featured (specified) | Removed (specified) |

Existing open jobs, gigs, and listings are **not** auto-deleted.

During **auto-suspend**, treat them as Suspended: reads only. After it ends, fall back to this table.

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
| Ban | Temp or permanent. Appeal only. | Threats, payment fraud, dispute conviction. |

Staff may skip rungs for severe harm. Skipping does not add extra warning points unless they also issue a warning.

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

| Action | Who | Points | Access |
|---|---|---|---|
| Warning expires | System | that row drops out of the sum | Band recalculated |
| Rescind one warning | Staff who can warn | that row no longer counts; stays on the Record as rescinded | Band recalculated |
| Pardon | Admin / Support | all warning hits cleared | Active, 0 points |
| Appeal accepted | Support | standing lift in 24h; leftover warnings still count | Ban/lock/suspend end in 24h, then band from leftover points |
| Appeal denied | Support | unchanged | optional 12-month appeal block |

Expired warnings are marked `expired` when account access is rebuilt (`expireElapsedWarnings`). They do not wait for staff.

---

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

**Owner Record:** Platform Merit, standing, each warning (type, merit taken, expiry, status), what is auto-locked.

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

## 16. Worked examples

**Off-topic flood (1 pt)**  
Record only, 3 days. Can still post jobs and write forums.

**Harassment (5 pt)**  
Limited, 14 days. No urgent jobs. Listings go to review. Can still propose, write forums, cash out.

**Hate speech (8 pt)**  
Restricted, 45 days. No new jobs/gigs/listings/forum writes/new teams/shared editor. 3 proposals/day. Live contract stays.

**Two harassment warnings still active (5+5 = 10)**  
Restricted until the first one expires, then Limited if 5 remain.

**Threats (10 pt)**  
Restricted 90 days **and staff should suspend or ban**. Engine does not auto-ban.

**Harassment + hate (5+8 = 13)**  
Restricted.

**10 + 8 still active (18)**  
Frozen access: no proposals, no new DMs, no cashout.

**Two 10s (20)**  
7-day auto-suspend. After 7 days, Frozen access until points drop. Not suspended again unless a new warning crosses 20.

**Three 10s (30)**  
14-day auto-suspend. Then Frozen access. Staff look at ban.

---

## 17. Data, APIs, files

### Tables

- `warning_defs` — named library: slug, label, category, points 1–10, duration_days 1–365, desks jsonb, note, is_system, sort_order, deleted_at. Migration `1826400000000_warning-defs` plus `1826600000000_warning-duration-and-thresholds`.
- `warning_thresholds` — min_points, effect (`none` / `record` / `limited` / `restricted` / `frozen` / `auto_suspend`), label, suspend_days, is_system, deleted_at.
- `violations` — issued cases: type (label), reason, points, status, staff_id, expires_at.

### APIs

- `GET /api/admin/warning-catalog?desk=` and `GET /api/moderator/warning-catalog?desk=`
- `GET/POST /api/admin/warning-defs`, `PATCH/DELETE /api/admin/warning-defs/:warningDefId` `{ label, category, points, durationDays, desks, note }`
- `GET/POST /api/admin/warning-thresholds`, `PATCH/DELETE /api/admin/warning-thresholds/:thresholdId` `{ minPoints, effect, label, suspendDays, note }` (Admin only)
- `POST /api/admin/accounts/:accountId/warn` `{ warningId, reason }`
- `POST /api/admin/accounts/:accountId/warnings/:violationId/rescind`
- Moderator restriction desks: `POST .../restrictions/violations` with the same `{ warningId, reason }`

### Code

- Catalog seed: `backend/lib/WarningCatalog.js`, `frontend/src/lib/warningCatalog.ts`
- Resolve + admin CRUD: `WarningDefServices` / `WarningDefRepositories` / `WarningDefControllers`
- Issue: `warnAccount`, `issueViolation`
- Duration: catalog `duration_days` via `warningExpiry` in `AccountRestriction.js` (staff-sent clocks ignored)
- Thresholds: `WarningThresholdServices` / `WarningThresholdRepositories`; live cache in `WarningBands.js`
- Active sum + auto-suspend: `sumActiveWarningPoints`, `maybeAutoSuspendAfterWarning` in `ModerationPolicy.js`
- Admin UI: `/admin/warnings`, warn picker `WarningPresetFields`
- Product limits: `backend/lib/WarningBands.js` `ACTION_ALLOW`, enforced by `WarningBandServices.assertWarningAllows`

---

## 18. Balance rules

1. Use **active points**, not warning count. Three 1-point slaps must not suspend anyone.
2. **5 points is the minor slap.** Limited, 14 days.
3. **8 points is the first real lockdown.** Restricted.
4. Auto-suspend is a **cooldown**, not a loop.
5. Live work is sacred. Restricted and Frozen access never cancel an open contract, gig order, or existing team project.
6. No death spiral. Being Frozen or suspended does not add points.
7. Staff always win. Manual timeout / suspend / lock / ban overrides the auto band.
8. Severe rows are “warn for the record, then staff lock/ban.” The engine never auto-bans.
9. Stars never throttle. Warning points never change a star rating.

When this file and the code disagree, fix the code or update this file in the same change.
