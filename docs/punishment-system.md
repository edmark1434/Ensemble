# Ensemble Punishment System

This is the operating contract for standing locks. One ladder, wired into every Ensemble product: jobs, proposals, gigs, orders, contracts, dashboard, disputes, asset marketplace, discovery, forums, teams, projects/editor, inbox/calls, credits/wallets/cashout/subscriptions, profile/verification, tickets/reports, notifications, and all staff desks.

If someone is **warned**, warning points apply. When they take Platform Merit down to a threshold, a **timed automatic punishment** starts (Limited, Restricted, Frozen access, Mute, or Suspension) and runs its full number of days. Timeout, suspend, lock, and ban lock access immediately. Backend enforces every lock in this file. Users see those points as **Platform Merit** ([merit-system.md](merit-system.md)).

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
         merit drops to a threshold level
                    │
                    ▼
         a TIMED AUTOMATIC PUNISHMENT starts
         (fixed days; it does not end when the
          warning expires or merit recovers)
         It never adds or removes warning points.
```

**Yes: warnings add points.** Points 1–10, always temporary (3 days at 1pt, 14 days at 5pt, 90 days at 10pt). Timeout, suspend, lock, ban, notice, and lost disputes do **not** add extra points. Prefer issuing a warning on the same action if staff want the auto band to move.

**No death spiral.** Automatic punishments never create a new warning, never auto-ban, and never add or remove points. Dropping further crosses harsher rules, so punishments escalate; each rule starts once per drop past it.

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
- Merit dropping to a threshold starts a timed punishment ([warning-system.md](warning-system.md) §8). Seeded: merit 60 Limited 1d, 55 Mute 1d, 50 Mute 2d, 45 Restricted 2d, 40 Frozen access 3d, **30 auto-suspend 3d**, 20 auto-suspend 7d. Nothing automatic happens above merit 60. None of them add points, and none end when the warning expires.

Staff pick a **named warning** from `warning_defs`. Points are locked to that row. Admin can create or edit rows at `/admin/warnings`. Case notes are free text. Seeded list: [warning-system.md](warning-system.md) §6.1.

A first confirmed no-show is **No-show / ghosting after hire** (5 points, 14 days). Confirmed fake delivery is **Fake delivery or empty work** (8 points, 45 days). There is no extra no-show hit.

### 4.3 Forum timeout

`restrictions.forum_timeout`. Can read `/forums`. Cannot POST/PATCH/DELETE `/api/forum*`. Other products stay open unless band/standing says otherwise. Public Timeout chip. Prefer issuing a warning on the same action if staff want warning points applied.

Timeout itself adds no points. The warning on the same action is the only hit.

Staff pick a **named timeout** from `punishment_defs` (`kind = timeout`). Duration is the catalog default (seeded 1–14 days). Staff may override the clock and must write case notes.

### 4.4 Suspension

Read the whole platform. Writes blocked except logout, token refresh, mark notifications read. Cannot complete contract actions, chat-send, list, cash out, or ticket-create. Public Suspended chip. Auto-suspend follows its rule (seeded 3 or 7 days). Manual 1–30 typical.

Still allowed while suspended (`SUSPENDED_WRITE_ALLOWLIST` in `AccountRestriction.js`): reads that use POST (`/api/users/list-of-details`), chat read receipts and the inbox group-size sync, leaving/ending/syncing a call already running, the appeal ticket and its evidence uploads, two-factor setup/changes, and cancelling a subscription (stopping charges is never blocked). Over Socket.IO a suspended member may join and leave rooms (conversations, forums, disputes), read presence and active calls, and send read receipts (`SUSPENDED_SOCKET_EVENTS` in `WebSocket.js`); everything else is refused. Socket standing refreshes on every status change and at most every 30 seconds on a write event, so a suspension that starts or ends applies without a reconnect.

Staff pick a **named suspension** from `punishment_defs` (`kind = suspend`). Duration is the catalog default unless they set a custom clock. Auto-suspend from warning points does not use this catalog.

Auto-suspend runs its own fixed clock. A suspension already running is extended when the new one would end later, never shortened. Unsuspending (or any staff standing change) closes the automatic-suspension record.

After it ends, any automatic band or mute still running applies. The suspend lock itself is gone. Punishments: [warning-system.md](warning-system.md).

### 4.5 Lock

Investigation / compromised account. Users: appeal-only (`/account/appeal`, tickets, disputes). Staff/team accounts: session cleared. **No extra warning points.** Outcome must be warn, suspend, ban, or restore.

### 4.6 Ban

Temp or permanent. Dispute conviction = permanent ban of `for_account_id`. Sign in only to appeal and view tickets/disputes. Listings/gigs/jobs stop being actionable; staff hide or close them. Badges hidden on public profile. Appeal accept → lift in **24 hours** by default (staff may lift now or shorten), then recompute. The ban is its own appeal, separate from any warning or timeout. Reopening a dispute does not unban.

Staff pick a **named ban** from `punishment_defs` (`kind = ban`). Duration is the catalog default (days or permanent) unless they set a custom clock. Only Admin and Support can ban. Admin CRUD is `/admin/warnings` → Ban, suspend, timeout.

Warning points stay on leftover unexpired rows. After appeal lift, the auto band is calculated from those leftover points.

### 4.7 Pardon vs rescind vs appeal

| Action | Who | Warning points | Access |
|---|---|---|---|
| Rescind one warning | Staff who can warn | that row no longer counts | The automatic punishments **that warning started** end (including an automatic suspension it caused); others keep running |
| Lift points | Admin / Support Moderator | N points (or up to a target merit) stop counting; warnings stay on the Record | Unchanged: running automatic punishments keep their clocks ([warning-system.md](warning-system.md) §8, §12) |
| Unfreeze / End early | Admin / Support Moderator | unchanged | The chosen automatic punishments (default all bands and mutes) end now; staff-only reason; the member gets a "You're unfrozen" notice when Frozen access ends. Users list row menu → Unfreeze, or the Automatic punishments panel |
| Pardon | Admin / Support Moderator | all warning hits cleared | Active; every automatic punishment ends |
| Appeal accepted | Support via “Appeal an account penalty” (one appeal per penalty) | an accepted **warning** appeal rescinds that warning | only the appealed penalty: ends in 24h (default), now, or at an earlier time staff pick |
| Appeal denied | Support | unchanged | that penalty: 12-month appeal block, or permanent; optional suspend/ban in the same step |

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

**If warning points are high, what happens?** Each threshold merit drops past starts a timed punishment ([warning-system.md](warning-system.md) §8). Not an auto-ban. Auto-suspend is seeded at **merit 30** (3 days) and **merit 20** (7 days).

**When does an automatic punishment end?** When its days run out. Not when the warning expires, not when staff lift points, not when merit recovers. Staff can end one early; pardon, an accepted appeal, or rescinding the warning that started it also end it.

**Do punishments stack?** Yes. Warning points stack into merit, and each deeper drop starts a harsher automatic punishment; different kinds run side by side, and of the same kind the one that ends last wins. A staff timeout or suspend on the same action does not add points. For each feature take the stricter of standing vs the strictest running band; ban/lock always wins.

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
6. Automatic punishments running (strictest band, mute) → product limits in [warning-system.md](warning-system.md) §9.
7. Otherwise allow.

A user with 0 warning points who is suspended still cannot write. A member whose warnings have expired can still be in a running Restricted band. A Frozen-access user who is Active can still finish a live contract.

---

## 7. Standing matrix

Legend: **OK** = allowed. **NO** = blocked. Automatic punishment columns (Limited / Restricted / Frozen access / Mute) live in [warning-system.md](warning-system.md) §9 and are checked only after this table.

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
- Deactivate is voluntary, not a punishment, not a warning-point hit. 72h reactivation rule stays. After reactivating, the member waits 7 days before deactivating again (`accounts.deactivation_available_at`).
- Deactivation needs an Active standing and nothing other people are waiting on: no contract that is Active, Waiting or Pending Signature, and no open dispute on either side. A penalty cannot be hidden behind a deactivation.
- Deactivated members are hidden from every member and guest (profile, search, followers, galleries) and nobody can follow, message, propose to, offer to, or order from them; their jobs and gigs leave browse. Staff and admins bypass all of it. A penalty issued on a deactivated account keeps `deactivated_at`, keeps the profile hidden, and returns the account to Deactivated (not Active) when it ends; staff cannot "restore" a deactivation away, only the member reactivates.
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

- Product disputes are **Contract** or **Transaction** only. Users file from a contract; remaining escrow is frozen until staff close the case.
- Hidden (not yet public): only the filer can send more information to staff. The other party cannot see or reply.
- Opening a visible dispute: public **Under dispute** chip, and both parties can talk. **No warning-point change.**
- Respondent found at fault: standing as staff chose. Conviction path already permanent-bans `for_account_id`. **No automatic extra points.** Staff may also issue a warning if they want points taken.
- Filer found to be abusing disputes: `work` or `conduct` warning on the **filer** — that warning is the point hit.
- Suspended cannot file a new dispute (write block) — the other party or staff can still open from the staff desk if money is trapped.
- Banned/locked: appeal and tickets only. Reopening a dispute does not unban.
- Escrow release / refund stays a staff action. Punishment never moves credits by itself. An open dispute also blocks party release, refund, and cancellation.

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
- **Credit hold** (Admin/Support "Freeze credits"): moves the available Account Wallet balance into `frozen_balance_credits`. Staff must write the reason the member sees and may set a release date (1–365 days); no date means until staff review. Freeze and release lock the wallet row, update relatively and write one `Escrow Hold` / `Escrow Release` ledger row referencing `wallets`. The member is notified (`account:credits_hold`). Holds with a date are released by the one-minute standing job. A hold is an appealable penalty; an accepted appeal shortens it to end within 24 hours. Credits received after the hold stay spendable.
- Transactions history is always readable except Ban/Lock (appeal-only).

### 8.9 Forums

**Routes:** `/forums`, `/forums/group/:id`, `/forums/discussion/:postId`

**Punish:** Forum Moderator. Timeout is forum-only. Conduct/spam warnings still add global points and can push bands that then lock jobs/gigs/assets.

- Timeout: read OK, write `/api/forum*` NO (including forum reports).
- Automatic Restricted / Frozen access and Mute also block forum writes (reports stay open). A staff timeout still wins if it is active.
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
- Product reports: Limited/Restricted/Frozen OK, including forum reports (the band's forum-write lock does not cover `/api/forum/reports`). Forum reports NO during a timeout. Suspended/Ban/Lock NO.
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
| Open job, owner banned | Closed automatically by the ban. Open applicants' proposal fees are refunded and their proposals closed; with no applicants the posting fee is refunded (the jobs engine's own rule). |
| Open job, owner suspended | Stays open; staff may close it. |
| Unsigned job offer, either side banned | Withdrawn automatically through the normal reject path; the client's escrow returns to their Account Wallet. |
| Gig, seller banned | Closed automatically; unconfirmed orders are cancelled and the clients notified (no credits are held before confirmation). |
| Pending proposals / gig orders by a banned member | Withdrawn automatically so no one can hire them. Proposal fees follow the normal withdraw rule. |
| Live contract, party suspended | They cannot write. Other party can file a ticket/dispute. Staff may extend deadlines or cancel with escrow rules. |
| Live contract, party banned | Staff resolve via dispute/escrow. Ban does not silently keep money. The ban clean-up counts these for staff and leaves them untouched. |
| Published or pending asset, creator banned | Delisted automatically (note: removed because the account was banned). Buyers keep purchased originals. New purchases stop. |
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
Merit drops to 30 / 20 ──► system ──► 3 / 7-day suspend (fixed clock, no extra points)
Merit drops to 40 ──► system ──► Frozen access 3 days (no ban)
Merit drops to 55 / 50 ──► system ──► Mute 1 / 2 days
```

Frozen access and Mute are timed automatic punishments, not standings. They are on this map so staff do not confuse them with a ban. Every desk lists the running ones next to merit; Admin / Support can Unfreeze.

---

## 11. Visibility

**Public** (`/profile/:id`, job/gig/asset author chips): chips for Banned / Suspended / Locked / Timeout / Under dispute. Star ratings and badge pins are the other systems. Badges hidden if Banned or Locked.

**Owner:** Record modal — Platform Merit with "Running now", standing, warnings, timeouts, automatic punishments (running and past), recent activity. The owner's profile merit ring lists what is running and until when; visitors see only the neutral merit tier and public chips.

**Suspended members are stopped before they start.** The backend refuses every write, and the client also switches writes off up front so nobody fills in a form for nothing. `SuspensionGuard` (`frontend/src/components/account/SuspensionGuard.tsx`, rules in `frontend/src/lib/suspensionGuard.ts`) locks write controls site-wide. Locked controls are faded, show a not-allowed cursor and an amber dashed ring on hover, have a tooltip, and give one heads-up toast on click; typing, uploads and form submits are blocked too. Reading, navigation, search, filters, logout, the appeal page and support tickets stay open. `SuspendedRouteGate` shows a "paused" page instead of write-only pages (job/gig create and edit, proposals, gig orders, checkout, new project, dispute form, team invite/join, business verification). Forum controls treat a suspension like a timeout. A control that must stay usable while suspended goes inside `data-suspension-keep`.

**Owner status bar:** while signed in, a bar under the header shows Suspended, an automatic band (Limited / Restricted / Frozen access), Muted, Credits on hold, or Forum timeout with a live countdown. "How to fix" opens a sheet listing, for each one, what is paused, when it ends (`suspensionEndsAt`, `warningBandEndsAt`, `mutedUntil`, `creditsFrozenUntil`, `forumTimeoutEndsAt`, `meritPenalties` from `getAccountAccess`) and how to get back to normal (wait, or appeal). Automatic punishments say they run their full time even if merit recovers. The appeal page and the wallet show the same list. Copy lives in `frontend/src/lib/standing.ts`. Automatic punishments and credit holds can be hidden until they change; a suspension cannot.

**Never public:** warning text, points, staff names, case IDs, pardoned rows as active.

**Counterparties** on a job/gig/contract see public chips only, not the Record.

---

## 12. Flows and examples

### Warning on forums that hits jobs

```
Forum mod warns (conduct, 5pt)
  → standing: Active (timeout optional)
  → merit 95: above 60, so nothing automatic happens
  → the warning is on the private Record for 14 days
```

### Jobs no-show

```
Jobs mod issues work warning 8pt for a no-show
  → standing still Active
  → merit 92: nothing automatic (first lockdown is at merit 45)
  → live contract still deliverable
```

### Escalation

```
merit 62 → 55 (new warning) → Limited 1 day + Mute 1 day
merit 55 → 50 (another)     → Mute 2 days from now
merit 50 → 40 (another)     → Restricted 2 days + Frozen access 3 days
warnings expire              → merit recovers, running punishments keep their end
Frozen access ends           → member is told "You're unfrozen"
```

### Dispute conviction

```
open dispute → Under dispute chip, warning points unchanged
convict → permanent ban, score frozen (no extra −15), badges hidden, appeal only
escrow handled by staff, not by the band engine
```

### Three warnings

```
merit drops to 30
  → auto-suspend 3 days (fixed clock, no extra points)
  → after 3 days the suspend lock lifts
  → any band or mute still running applies until its own end
```

---

## 13. Anti-abuse and implementation

- Staff cannot invent a custom point value. They warn, rescind, lift points, or pardon. Lifting only ever lowers points and never ends a running automatic punishment. Active points are summed from `violations`; automatic punishments live in `merit_penalties`.
- Nobody can suspend their own account. Moderators cannot suspend a moderator or an admin. Only Admin can suspend those staff accounts. Auto-suspend from warning points is unchanged.
- Only warnings add points. Timeout, suspend, lock, ban, and disputes never add a second hit.
- Expired suspend/ban/lock, expired warnings and finished automatic punishments are closed in a **background job**, not only on next page load.
- Proposal and listing fees are not charged on a rejected action.
- `CheckSession` already enforces ban/lock/suspend/timeout. Keep that as the standing gate. Warning-point bands are additional guards in [warning-system.md](warning-system.md).
- Record activity must include `ACCOUNT_WARNED`, `VIOLATION_ISSUED`, `WARNING_ISSUED`, `ACCOUNT_PARDONED`.

Implementation rules (enforced in code):

- Every standing action — warn, timeout, suspend, lock, ban, restore, pardon, rescind, credit adjustment — refuses to act on the actor's own account, and only an Admin may act on another staff account (`assertCanSanctionTarget` in `backend/lib/SuspendGuards.js`).
- Status changes must match the current standing: unsuspend only lifts a suspension, unlock a lock, unban a ban. A banned account can only be changed by Admin or Support, so a specialist moderator cannot lift a ban through unsuspend/unlock or a suspension.
- The automatic suspension never writes Suspended over a ban or lock, and never shortens a suspension already running.
- Every ban (Users desk, dispute conviction, report sanction) runs `closeBannedAccountListings` (`backend/services/BanCleanupServices.js`) after the ban is saved: see §9 for what closes. Each item is its own transaction; failures are reported in the staff response and the `ACCOUNT_BAN_CLEANUP` activity row and never undo the ban. Lifting the ban does not reopen anything — the member reposts, or reopens a closed gig. Locks and suspensions do not run it.
- Report decisions follow the same role rules: specialist moderators may warn or suspend from a report, only Admin/Support may ban. A report is claimed for its decision before the sanction runs, so a double submit cannot sanction twice.
- A report warning uses the named warning staff pick (desk-checked like any warning); **Staff follow-up warning** is only the default. A report that names no other account (technical problems, whose account columns point at the reporter) cannot be sanctioned — close or deny it.
- Sanctioned and Denied are final: a hand edit cannot set them, change them, or reopen the report for a second sanction. Other statuses (open, in progress, closed, …) can still be changed by the handler. Claiming a report is guarded in SQL; a second claimer gets 409 (Admin may still take over).
- A member holds at most one open report per item (409 `REPORT_ALREADY_OPEN`); technical-problem reports are exempt. Team member reports must name an account with a membership on that team.
- When a ban, lock or suspension ends (expiry, unban/unsuspend/unlock/restore, pardon, accepted appeal) on a member who had deactivated the account, it returns to **Deactivated**, not Active; the member reactivates it themselves.
- Expired bans, locks, suspensions and warnings lift in a one-minute background job (`reconcileExpiredStandings`), which records the lift and notifies the member, as well as on the member's own next request.
- Suspended members may open and answer an **appeal ticket** (and nothing else on tickets), the same as banned and locked members. Their banner links to `/account/appeal`; so does the forum-timeout banner. To attach evidence, banned, locked and suspended members may also call `POST /api/files/upload-url` and `/api/files/finalize`, but `generateUploadUrlController` accepts only the `ticket-attachments` folder from them.
- Appeals are **per penalty** (`services/PenaltyAppealServices.js`, migration `1829400000000_per-penalty-appeals`). Each active penalty is its own appeal target: the ban / lock / suspension (identified by the `ACCOUNT_STATUS_CHANGED` row that moved the account into that status, so an extension stays the same penalty), each forum timeout (`restrictions`), each warning (`violations`), each automatic merit punishment (`merit_penalties`; the automatic suspension is appealed as the suspension) and each credit hold (`<wallet_id>@<frozen_at>`; a second hold is a new penalty). `GET /api/users/appeals` lists them with their appeal state; the member picks one on `/account/appeal`, and the ticket stores `appeal_target_*`.
- Filing needs that penalty to be active. It is refused when that penalty already has an undecided appeal (partial unique index), was accepted, was denied less than 12 months ago, or was denied permanently.
- **Appeal window:** a penalty must first be appealed within **30 days** (`APPEAL_WINDOW_DAYS` in `PenaltyAppealServices.js`) of being issued, or of its latest extension / re-issue. After that it is `window_closed` (403 `APPEAL_WINDOW_CLOSED`) and cannot be appealed, though it stays active until it ends. Only the first appeal has this deadline: a penalty whose appeal was denied (12 months) can be appealed again once that hold ends. The member page shows "Appeal by …" while the window is open. Staff opening an appeal for a member go through the same check. A decision covers the penalty as it was when decided: an extension or re-issue after it can be appealed again. Other penalties are never blocked by it. An undecided account-wide appeal from before the change blocks new appeals until it is decided; old `account_appeal_holds` rows still cover the penalties that existed when they were decided.
- Only Admin or the assigned Support Moderator decides, under a row lock, never on their own account. Accepting changes only the appealed penalty: ban / lock / suspension / timeout / automatic punishment / credit hold end within 24 hours (default), now, or at an earlier time staff pick — never later than planned; a warning is rescinded at once (its automatic punishments end, the band refreshes). A penalty that already ended or was replaced is left alone and the decision is still recorded. Denying holds that penalty for 12 months or permanently, and may also suspend or ban the account in the same step (a named catalog punishment through the Users desk path; checked before the decision is saved, and a suspension never replaces a ban or lock). Staff may add a note for the member. The decision is posted in the ticket chat as a decision card (`messageType: 'appeal_decision'`) and stored in `appeal_outcome` / `appeal_decision_note`. Account-wide appeals filed before the change keep the old decision (everything ends in 24 hours, account-wide hold).
- Undecided appeal tickets cannot be closed by a status change, a scheduled close, or the inactivity auto-close; they end only with a decision. A decided appeal cannot be reopened (409); the staff form no longer sends its status. Inactivity auto-close only applies when staff replied last.

Build order (punishment slice):

1. Record event codes, Restriction views show live standing + warning points + auto-locks.
2. Punishment → warning points, expiry job, **backend guards for every row in §7**.
3. Appeal 24h lift, pardon/rescind paths.

Do not describe this as live in `backend/data/` until it ships.
