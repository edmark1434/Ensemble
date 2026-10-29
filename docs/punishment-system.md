# Ensemble Punishment System

This is the operating contract for standing locks. One ladder, wired into every Ensemble product: jobs, proposals, gigs, orders, contracts, dashboard, disputes, asset marketplace, discovery, forums, teams, projects/editor, inbox/calls, credits/wallets/cashout/subscriptions, profile/verification, tickets/reports, notifications, and all staff desks.

If someone is **warned**, warning points apply and may auto-limit products. Timeout, suspend, lock, and ban lock access immediately. Backend enforces every lock in this file. Users see those points as **Platform Merit** ([merit-system.md](merit-system.md)).

Punishment answers “what is locked right now?” Warnings answer “did they break the rules?” ([warning-system.md](warning-system.md)). Stars answer “was the work good?” Badges answer “what have they earned?” ([badges-system.md](badges-system.md)). Merit answers “can we trust this account?”

---

## Contents

1. How punishment connects to the other systems
2. Who this applies to
3. Starting state
4. Ladder
5. Direct answers
6. Enforcement order
7. Standing matrix
8. Per-product: how punishment starts
9. Live work already in progress
10. Staff map
11. Visibility
12. Flows and examples
13. Anti-abuse and implementation

---

## 1. How punishment connects to the other systems

```
event on any Ensemble product
        │
        ▼
 staff or system issues a PUNISHMENT
 (warning / timeout / suspend / lock / ban)
        │
        ├──► access is locked immediately (standing)
        └──► if it is a WARNING, POINTS APPLY
             (see warning-system.md for active points)
                    │
                    ▼
         warning points cross a band
                    │
                    ▼
         extra AUTOMATIC LIMITS apply
         Those limits are not a second punishment.
         They do not add more warning points.
```

**Yes: warnings add points.** Points 1–10, always temporary (3 days at 1pt, 14 days at 5pt, 90 days at 10pt). Timeout, suspend, lock, ban, notice, and lost disputes do **not** add extra points. Prefer issuing a warning on the same action if staff want the auto band to move.

**No death spiral.** Automatic warning bands never create a new warning, never auto-ban, and never add more points.

Staff may skip rungs for severe harm (threats, theft, impersonation, CSAM, payment fraud). Skipping does not add extra warning points. Points only move if a warning is issued.

---

## 2. Who this applies to

| Actor | Punishments | Notes |
|---|---|---|
| Guest | No | Browse only. |
| User account (enthusiast / freelancer / client — same account) | Yes | One standing covers every role. |
| Team account | Team can be locked/banned as an account | Acting **user** still needs to be allowed to perform the action. A Frozen or banned member cannot post a team job. |
| Staff | Staff/team ban/lock clears their session | Staff `performanceScore` on moderation is workload, not this system. |

Subscriptions (Free / Premium / Business) never skip a punishment.

Warning bands and badges for these actors: [warning-system.md](warning-system.md) §2 and [badges-system.md](badges-system.md) §2.

---

## 3. Starting state

| Field | New user |
|---|---|
| Standing | Active |
| Punishments | None |
| Access | Full. New is not a crime. |

New users start at 0 active warning points. Pending Alpha Tester is the [badge system](badges-system.md).

---

## 4. Ladder

Punishment is the standing lock. **Only the warning rung adds points.** Timeout, suspend, lock, and ban lock access and leave warning points alone unless a warning is also issued.

### 4.1 Notice (not a punishment)

Automod flag, link scan, listing held for review. No warning points. Not on the public profile.

### 4.2 Warning

`violations` row. Staff pick a **named warning**. Points and duration are locked to that row. Warnings are **always temporary**. Duration is copied from the named warning in [warning-system.md](warning-system.md) §5. Staff cannot issue a permanent warning and cannot change the clock.

Seeded catalog durations by points (admin can set 1–365 independently):

| Points | Seeded duration |
|---|---|
| 1 | 3 days |
| 5 | 14 days (minor) |
| 10 | 90 days |

- Whole site still usable unless a warning band or another punishment says otherwise.
- Private Record shows it.
- Toast tells them a warning was issued.
- **20+** active warning points → auto-suspend 7 days. The suspend lock is standing only; it does **not** add extra points.

Staff pick a **named warning** from `warning_defs`. Points are locked to that row. Admin can create or edit rows at `/admin/warnings`. Case notes are free text. Seeded list: [warning-system.md](warning-system.md) §6.1.

A first confirmed no-show is **No-show / ghosting after hire** (5 points, 14 days). Confirmed fake delivery is **Fake delivery or empty work** (8 points, 45 days). There is no extra no-show hit.

### 4.3 Forum timeout

`restrictions.forum_timeout`. Can read `/forums`. Cannot POST/PATCH/DELETE `/api/forum*`. Other products stay open unless band/standing says otherwise. Public Timeout chip. Prefer issuing a warning on the same action if staff want warning points applied.

Timeout itself adds no points. The warning on the same action is the only hit.

Staff pick a **named timeout** from `punishment_defs` (`kind = timeout`). Duration is the catalog default (seeded 1–14 days). Staff may override the clock and must write case notes.

### 4.4 Suspension

Read the whole platform. Writes blocked except logout, token refresh, mark notifications read. Cannot complete contract actions, chat-send, list, cash out, or ticket-create. Public Suspended chip. Auto-suspend is always 7 days. Manual 1–30 typical.

Staff pick a **named suspension** from `punishment_defs` (`kind = suspend`). Duration is the catalog default unless they set a custom clock. Auto-suspend from warning points does not use this catalog.

Warning points: leftover active points still apply the auto band.

After it ends, leftover warning points still apply Restricted/Frozen access. The suspend lock itself is gone. Bands: [warning-system.md](warning-system.md).

### 4.5 Lock

Investigation / compromised account. Users: appeal-only (`/account/appeal`, tickets, disputes). Staff/team accounts: session cleared. **No extra warning points.** Outcome must be warn, suspend, ban, or restore.

### 4.6 Ban

Temp or permanent. Dispute conviction = permanent ban of `for_account_id`. Sign in only to appeal and view tickets/disputes. Listings/gigs/jobs stop being actionable; staff hide or close them. Badges hidden on public profile. Appeal accept → lift in **24 hours**, then recompute. Reopening a dispute does not unban.

Staff pick a **named ban** from `punishment_defs` (`kind = ban`). Duration is the catalog default (days or permanent) unless they set a custom clock. Only Admin and Support can ban. Admin CRUD is `/admin/warnings` → Ban, suspend, timeout.

Warning points stay on leftover unexpired rows. After appeal lift, the auto band is calculated from those leftover points.

### 4.7 Pardon vs rescind vs appeal

| Action | Who | Warning points | Access |
|---|---|---|---|
| Rescind one warning | Staff who can warn | that row no longer counts | Unchanged, except remaining band/suspend |
| Pardon | Admin / Support Moderator | all warning hits cleared | Active |
| Appeal accepted | Support via “Appeal an account penalty” | recompute after 24h lift | ban/lock/suspend end in 24h |
| Appeal denied | Support | unchanged | optional 12-month appeal block |

### 4.8 Who can punish

| Role | Warn | Timeout | Suspend / lock | Ban / restore | Pardon |
|---|---|---|---|---|---|
| Admin, Support Moderator | Yes | Yes | Yes | Yes | Yes |
| Forum Moderator | Yes | Yes | Yes | No | No |
| Marketplace Moderator | Yes | No | Yes | No | No |
| Jobs N Gigs Moderator | Yes | No | Yes | No | No |

Specialist mods act from their report desks. Conviction bans go through the dispute decision path.

---

## 5. Direct answers

**If they are punished, are warning points added too?** Only if it is a **warning**. Timeout, suspend, lock, ban, notice, and disputes do not add points.

**If warning points are high, what happens?** Automatic product locks in [warning-system.md](warning-system.md). Not an auto-ban. Auto-suspend is **20+ active warning points** (7-day cooldown), or 14 days at 30+.

**Do punishments stack?** Standing locks stack (timeout + warnings, then auto-suspend at 3 warnings). Only **warning points** stack. A timeout or suspend on the same action does not add extra points. For each feature take the stricter of standing vs band; ban/lock always wins.

**Can they buy their way out of a punishment?** No. Not with credits, not with Premium/Business.

**Are badges removed when they are punished?** Not deleted. Hidden on the public profile while Banned or Locked (and while Frozen). Admin revoke only for fraud or mistaken grant. See [badges-system.md](badges-system.md).

---

## 6. Enforcement order

Evaluate in this order. First match that blocks, wins.

1. Guest → browse only.
2. Deleted / deactivated → existing account-access rules.
3. Banned or locked → appeal allowlist only.
4. Suspended → reads only.
5. Forum timeout → blocks forum writes only.
6. Warning-point band → product limits in [warning-system.md](warning-system.md).
7. Otherwise allow.

A user with 0 warning points who is suspended still cannot write. A Frozen-access user who is Active can still finish a live contract.

---

## 7. Standing matrix

Legend: **OK** = allowed. **NO** = blocked. Limited / Restricted / Frozen-access columns live in [warning-system.md](warning-system.md) and are checked only after this table.

| Action | Route / surface | Timeout | Suspended | Ban / Lock |
|---|---|---|---|---|
| Browse jobs, gigs, assets, forums, profiles | `/jobs`, `/gigs`, `/assets`, `/forums`, `/profile/:id` | OK | OK | Appeal pages only |
| Post a normal job | `/jobs/create` | OK | **NO** | **NO** |
| Post an urgent job | `/jobs/create` + `is_urgent` | OK | **NO** | **NO** |
| Post a team job | `/jobs/create/team` | OK | **NO** | **NO** |
| Edit / extend / expire own job | `/jobs/edit/:id`, extend window | OK | **NO** | **NO** |
| Apply / send proposal | `/jobs/:id/make-proposal` | OK | **NO** | **NO** |
| Hire / send offer / accept proposal | `/jobs/proposals/...` | OK | **NO** | **NO** |
| Create a gig | `/gigs/create` | OK | **NO** | **NO** |
| Order a gig (as client) | `/gigs/services/:id/order` | OK | **NO** | **NO** |
| Accept / deliver a gig order | `/gigs/orders/...` | OK | **NO** | **NO** |
| Publish a marketplace listing | asset editor | OK | **NO** | **NO** |
| Buy an asset | `/assets/:assetId` | OK | **NO** | **NO** |
| Comment on an asset | asset details | OK | **NO** | **NO** |
| Talent / job discovery ranking | `/discovery`, job cards | OK | OK (read) | **NO** |
| Create forum group / post / comment / react | `/forums` | **NO** | **NO** | **NO** |
| Read forums | `/forums` | OK | OK | **NO** |
| New DM / new inbox group | `/inbox` | OK | **NO** | **NO** |
| Message existing job/gig/contract thread | inbox, contract chat | OK | **NO** | **NO** |
| Calls / Google Meet | inbox | OK | **NO** | **NO** |
| Create a team | `/teams` | OK | **NO** | **NO** |
| Join a team (accept invite) | `/teams/join/:code` | OK | **NO** | **NO** |
| Work on existing team | `/teams/:id`, `/team-project/:id` | OK | **NO** | **NO** |
| Personal video project / editor | `/projects`, `/projects/open/:id` | OK | **NO** | **NO** |
| New shared/team editor project | `/projects/select` | OK | **NO** | **NO** |
| Buy credits / subscribe | `/credits`, `/credits/checkout` | OK | **NO** | **NO** |
| Cash out | settings wallet | OK | **NO** | **NO** |
| File a dispute on existing work | `/contracts/dispute-form` | OK | **NO** | appeal/tickets only |
| File a report | in-product report | forum reports **NO** | **NO** | **NO** |
| Support ticket | `/support/ticket` | OK | **NO** | **appeal ticket only** |
| Appeal | `/account/appeal` | n/a | OK | **OK** |
| Rate / review after close | `/dashboard/rate` | OK | **NO** | **NO** |
| Claim a badge | `/notifications` | OK | **NO** | **NO** |
| Joed profile intro | `/profile` | OK | **NO** | **NO** |
| Identity verification | `/account-verification-status` | OK | **NO** | **NO** |

Guests: every mutating row is **NO**.

---

## 8. Per-product: how punishment starts

Each subsection is: where it lives, how a punishment starts, what standing does, which staff desk owns it. Warning-point band limits: [warning-system.md](warning-system.md). Badge triggers: [badges-system.md](badges-system.md).

### 8.1 Account, profile, settings, verification

**Routes:** `/signup`, `/login`, `/profile`, `/profile/:id`, `/settings`, `/account-verification-status`, `/account/appeal`

- Failed verification does not add warning points. Fraudulent ID is an `identity` warning (and usually a lock or ban).
- Email verification is not a punishment.
- Deactivate is voluntary, not a punishment, not a warning-point hit. 72h reactivation rule stays.
- Appeal page shows the Record and is the only home for banned/locked members.

**Staff:** Support / Admin user-team.

### 8.2 Home, search, discovery

**Routes:** `/home`, `/search/user/:query`, `/discovery`, `/discovery/:tab`

- User search may show public chips (Banned / Suspended / Locked / Timeout / Under dispute). Never warning text.
- Suspended users may still read discovery. Banned / locked cannot.

### 8.3 Jobs and proposals

**Routes:** `/jobs/postings`, `/jobs/create`, `/jobs/create/team`, `/jobs/edit/:id`, `/jobs/my-job-post`, `/jobs/applied`, `/jobs/saved-posts`, `/jobs/:id/make-proposal`, `/jobs/proposals/...`, application window extend/expire

**Punish:** fake jobs, fee evasion, hiring-then-ghosting, spam posts → Jobs N Gigs desk, `work` or `spam` warning. Conviction on a job dispute can ban.

**Standing effects:**

- Suspended/banned owner: staff close or freeze the post. Do not leave an Open job that nobody can hire on.
- Proposal submission fees (credits) are charged only when the proposal is **accepted by the backend**. A blocked proposal must not take credits.

### 8.4 Gigs and orders

**Routes:** `/gigs/services`, `/gigs/create`, `/gigs/edit/:id`, `/gigs/my-services`, `/gigs/services/:id/order`, `/gigs/orders/...`

**Punish:** stolen gig media, fake delivery, chargeback-style refund abuse → Jobs N Gigs desk.

**Standing effects:** Suspended / Ban / Lock cannot create, order, accept, or deliver. Live orders when a party is suspended: they cannot write; staff handle escrow (§9).

### 8.5 Contracts, dashboard, reviews

**Routes:** `/contracts`, `/contracts/:id`, `/dashboard`, `/dashboard/tasks`, `/dashboard/review`, `/dashboard/rate`, `/dashboard/archived`

- Cancelled / expired-without-hire / refund-without-delivery: no extra warning points in v1 unless staff issue a `work` warning (no-show).
- Suspended/banned users cannot deliver, accept, or rate. That can trap escrow — staff must act (§9).
- Dashboard itself is never hidden. Buttons that write follow the matrix.

### 8.6 Disputes

**Routes:** `/contracts/dispute-form`, `/contracts/disputes`, `/disputes/:id`

- Opening a visible dispute: public **Under dispute** chip. **No warning-point change.**
- Respondent found at fault: standing as staff chose. Conviction path already permanent-bans `for_account_id`. **No automatic extra points.** Staff may also issue a warning if they want points taken.
- Filer found to be abusing disputes: `work` or `conduct` warning on the **filer** — that warning is the point hit.
- Suspended cannot file a new dispute (write block) — the other party or staff can still open from the staff desk if money is trapped.
- Banned/locked: appeal and tickets only. Reopening a dispute does not unban.
- Escrow release / refund stays a staff action. Punishment never moves credits by itself.

**Staff:** Support for appeals; Jobs/Marketplace desks for the related entity; Admin for pardon.

### 8.7 Asset marketplace

**Routes:** `/assets`, `/assets/owned`, `/assets/purchased`, `/assets/saved`, `/assets/:assetId`

**Punish:** stolen assets, malware, fee evasion → Marketplace desk, `marketplace` warning. Listing review already exists (`marketplaceListingReview`).

**Standing effects:**

- Suspended/Ban/Lock cannot publish, buy, or comment.
- Purchased originals stay accessible to the buyer even if the creator is later banned (entitlement already granted). New purchases of a banned creator’s listings are disabled.
- Staff unpublish after a marketplace punishment or ban when needed.

Listing fees: charge only when the listing is actually accepted into pending/published. A 403 publish must not take credits.

### 8.8 Credits, wallets, cashout, subscriptions, transactions

**Routes:** `/credits`, `/credits-subscriptions`, `/credits/checkout`, `/transactions`, settings wallet

- Buying credits and managing a subscription: blocked by Suspended / Ban / Lock.
- Cashout: Suspended/Ban/Lock blocked. Band extra holds are warning-point bands, not standing.
- Wallets are never seized by a punishment automatically. Ban may freeze payouts; support handles leftover balances.
- Transactions history is always readable except Ban/Lock (appeal-only).

### 8.9 Forums

**Routes:** `/forums`, `/forums/group/:id`, `/forums/discussion/:postId`

**Punish:** Forum Moderator. Timeout is forum-only. Conduct/spam warnings still add global points and can push bands that then lock jobs/gigs/assets.

- Timeout: read OK, write `/api/forum*` NO (including forum reports).
- Restricted/Frozen-access warning bands also block forum writes. A staff timeout still wins if it is active.
- Creating groups: Timeout/Suspend/Ban NO.

**Staff:** `/moderator/forum` (discussion, reports, restrictions, disputes).

### 8.10 Teams, team jobs, business verification

**Routes:** `/teams`, `/teams/:id`, `/teams/join/:code`, `/teams/:id/business-verification`, `/teams/:id/tasks/:contractId`, `/team-project/:id`

- Teams have no warning ring. A team account can still be locked or banned.
- Every mutating team action checks the **acting user**.
- A banned **owner**: staff must transfer or lock the team. Other members should not be able to post jobs “as” a banned owner’s identity.
- Suspended/Ban/Lock cannot work on team projects, including existing ones.

**Staff:** Admin/Support manage teams; Jobs desk for team-posted jobs.

### 8.11 Projects and video editor

**Routes:** `/projects`, `/projects/personal`, `/projects/shared`, `/projects/team`, `/projects/select`, `/projects/open/:projectId`

- Personal, shared, and team projects: blocked by Suspended / Ban / Lock (those already block writes / sessions).
- Editor file uploads follow the same write rules as the project they belong to.
- Joed / AI tools inside the editor follow the same standing write rules.

### 8.12 Inbox, chat, calls, meetings

**Routes:** `/inbox/*`

- Timeout does not block inbox.
- Suspended blocks all sends, including existing job/gig/contract threads.
- Ban/Lock: appeal-only.

### 8.13 Notifications

**Route:** `/notifications`

- Warning, timeout, suspend, ban notify here and via socket (`account:warning`, `account:status_changed`).
- Claim badge: blocked by Suspended/Ban/Lock.
- Mark-as-read remains allowed while suspended (already on the allowlist).

### 8.14 Support, tickets, reports, Joed, legal, landing

**Routes:** `/support/ticket`, `/landing/*`, in-product reports, Ask Joed

- Support tickets: Suspended cannot create (write block). Banned/locked: **appeal ticket type only**.
- Product reports: Frozen OK except forum reports during timeout. Suspended/Ban/Lock NO.
- Filing a report is not a violation and adds no warning points.
- Joed / Ask Our Chatbot: read help always. Actions Joed claims must still hit the same backend locks. Do not put this spec into `backend/data/` until it ships (`backend/data` is current-behavior only).
- Legal/landing pages: no punishment effect.
- Feedback (`/landing/SendAFeedback`): same as tickets.

### 8.15 Admin and moderator desks

| Desk | Route | Owns | Can do to users |
|---|---|---|---|
| Admin | `/admin/user-team`, `/admin/moderation`, `/admin/badge-grant`, `/admin/analytics` | everything | full ladder, pardon, credits, verification. Analytics tracks credits and standing. |
| Support Moderator | `/moderator/support/*` | tickets, appeals, general standing | full ladder except treat pardon as Support+Admin |
| Forum Moderator | `/moderator/forum/*` | groups, posts, comments, forum reports | warn, timeout, suspend, lock. No ban, no pardon. |
| Marketplace Moderator | `/moderator/marketplace/*` | listings, asset reports, listing review | warn, suspend, lock. No timeout, no ban, no pardon. |
| Jobs N Gigs Moderator | `/moderator/jobs/*` | jobs, gigs, proposals, orders, work reports | warn, suspend, lock. No timeout, no ban, no pardon. |

Every desk’s Restrictions view must show **active warning points, band, and what is already auto-locked** so staff do not “double punish” a Frozen user with a pointless extra warning unless new harm happened.

---

## 9. Live work already in progress

When standing changes, **do not strand the other party or their credits.** Warning-band cases: [warning-system.md](warning-system.md) § Live work.

| Situation | What happens |
|---|---|
| Open job, owner suspended/banned | Staff or job expire-now path closes it. Application-window refund rules already in the jobs engine still run. |
| Live contract, party suspended | They cannot write. Other party can file a ticket/dispute. Staff may extend deadlines or cancel with escrow rules. |
| Live contract, party banned | Staff resolve via dispute/escrow. Ban does not silently keep money. |
| Published asset, creator banned | Staff unpublish. Buyers keep purchased originals. New purchases disabled. |
| Personal or team editor project, Suspend/Ban/Lock | Editor stops. Staff handle any live paid work on the related contract. |

---

## 10. Staff map (which product feeds which punishment)

```
Forum post/report ──► Forum desk ──► warn / timeout / suspend / lock
Asset listing/report ──► Marketplace desk ──► warn / suspend / lock / unpublish
Job, gig, proposal, order, contract report ──► Jobs desk ──► warn / suspend / lock
Team / profile / inbox report ──► Support ──► full ladder except treat pardon as Support+Admin

Each report stores a snapshot of the reported item. Staff get a platform-view link when the item still exists; otherwise the desk shows the snapshot (inbox messages are never linked).
Ticket / appeal / identity / billing ──► Support ──► full ladder + pardon
Dispute conviction ──► Support/Admin dispute decision ──► permanent ban (warn separately if points should apply)
20+ active warning points ──► system ──► 7-day suspend (no extra points beyond the warnings)
16+ active warning points ──► system ──► Frozen-access locks + moderation alert (no ban)
```

Frozen access is a warning-point band, not a standing. It is on this map so staff do not confuse it with a ban.

---

## 11. Visibility

**Public** (`/profile/:id`, job/gig/asset author chips): chips for Banned / Suspended / Locked / Timeout / Under dispute. Star ratings and badge pins are the other systems. Badges hidden if Banned or Locked.

**Owner:** Record modal — standing, warnings, timeouts, recent activity. Warning points and auto band live in the same modal.

**Never public:** warning text, points, staff names, case IDs, pardoned rows as active.

**Counterparties** on a job/gig/contract see public chips only, not the Record.

---

## 12. Flows and examples

### Warning on forums that hits jobs

```
Forum mod warns (conduct, 5pt)
  → standing: Active (timeout optional)
  → 5 active points → Limited for 14 days
  → cannot post urgent jobs, listings go to review
  → can still take gig orders, write proposals, and post in forums
warning ends → 50 Established again
```

### Jobs no-show

```
Jobs mod issues work warning 8pt for a no-show
  → standing still Active
  → 8 active points → Restricted for 45 days
  → forums unwritable, cannot post jobs or create gigs, 3 proposals/day
  → live contract still deliverable
```

### Dispute conviction

```
open dispute → Under dispute chip, warning points unchanged
convict → permanent ban, score frozen (no extra −15), badges hidden, appeal only
escrow handled by staff, not by the band engine
```

### Three warnings

```
active warning points reach 20
  → auto-suspend 7 days (standing cooldown, no extra points)
  → after 7 days the suspend lock lifts
  → leftover warning hits may still leave them Restricted or Frozen
```

---

## 13. Anti-abuse and implementation

- Staff cannot invent a custom point value. They warn, rescind, or pardon. Active points are summed from `violations`.
- Only warnings add points. Timeout, suspend, lock, ban, and disputes never add a second hit.
- Expired suspend/ban/lock and expired warnings lift in a **background job**, not only on next page load.
- Proposal and listing fees are not charged on a rejected action.
- `CheckSession` already enforces ban/lock/suspend/timeout. Keep that as the standing gate. Warning-point bands are additional guards in [warning-system.md](warning-system.md).
- Record activity must include `ACCOUNT_WARNED`, `VIOLATION_ISSUED`, `WARNING_ISSUED`, `ACCOUNT_PARDONED`.

Build order (punishment slice):

1. Record event codes, Restriction views show live standing + warning points + auto-locks.
2. Punishment → warning points, expiry job, **backend guards for every row in §7**.
3. Appeal 24h lift, pardon/rescind paths.

Do not describe this as live in `backend/data/` until it ships.
