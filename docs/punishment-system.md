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
| Team account | Team can be suspended/locked/banned as an account. Every team penalty also reaches people staff pick (the **leader** by default, specific members or all members); warnings and forum timeouts land only on those people | Teams have no warnings, disputes or merit of their own: staff read the members'. Acting **user** still needs to be allowed to perform the action. A Frozen or banned member cannot post a team job. See §8.10. |
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

Temp or permanent. Dispute conviction = permanent ban of `for_account_id`. Sign in only to appeal and view tickets/disputes (and stop plan renewal). Open jobs, gigs and listings close automatically (§9); a permanent ban also stops plan renewal. Badges hidden on public profile. Appeal accept → lift in **24 hours** by default (staff may lift now or shorten), then recompute, and what the ban closed is restored (§9.1). The ban is its own appeal, separate from any warning or timeout. Reopening a dispute does not unban.

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

- Suspended / locked owner (or a team whose leader is banned, locked or missing): the post pauses on its own — out of browse, no new proposals, invites or offers — and comes back when that ends (§9). Banned owner: closed by the ban clean-up. Nobody is left applying to a job nobody can hire on.
- Sanctioned job or gig report: staff choose to pause (default) or archive the reported posting with the sanction. Any staff pause / close / archive puts the posting on a staff hold: the owner cannot reopen it, is notified with the reason, and is pointed to a support ticket ("Appeal a jobs action"). Staff reopening it lifts the hold.
- What each staff status means for jobs and gigs (Jobs & Gigs Control shows this as its status guide and member view):
  - **Paused**: a temporary hold while staff investigate. It leaves the board and search (the owner still sees it in their own posts, and a direct link shows it as Closed). No new proposals or orders. Staff then reopen it or archive it.
  - **Closed**: stays on the board marked Closed and takes no new proposals or orders.
  - **Archived**: a confirmed violation. `deleted_at` is set and the posting is gone from the board, search, saved lists and its own page for everyone, the owner included. Staff can restore it.
  - Running proposals, orders and contracts continue in every case.
  - Owner page notice: while a job or gig is paused or closed on a staff hold, its page shows the people who manage it a notice saying what that means, the reason (from the last matching staff change) and a link to "Appeal a jobs action". The job API sends it as `staff_hold` and the gig API as `staffHold` (`PostingModerationServices.ownerStaffHoldNotice`), only to people who manage the posting.
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
- **Team on the freelancer side.** A client filing against a freelancer team (or a freelancer with included members / subcontractors on the contract workspace) names who answers for that side: the team leader (default), specific people or everyone. A freelancer filing against the client names nobody. Named people answer the case like the disputee once it is public. A dispute ban (plain or after an escrow ruling) reaches the named people by default; staff can pick the leader, specific people or everyone instead. Team members go through the team rules (§8.10: the team account and the people in scope, stricter standings stay, accounts staff may not act on stop the action unless everyone was picked); people outside the team (subcontractors, people who left) are banned one by one with a reason naming the dispute. Staff can change who is named while the case is open; a party swap clears them. See docs/api.md "Team members in a dispute".
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

- Teams have no warnings, disputes or Platform Merit of their own and never post in the forums. Every team penalty reaches people: staff pick who with `memberScope` — **team leader** (its first active Owner; the default, and **all members** in the console when the team has no leader), **specific members** (`memberAccountIds`, active members of the team) or **all members**. `memberScope: none` / `includeLeader: false` → 422 `TEAM_MEMBER_SCOPE_INVALID`; picking the leader of a leaderless team → 422 `TEAM_NO_LEADER`, before anything changes. A request without `memberScope` (report decisions, dispute bans, appeal follow-ups) reaches the leader.
  - A **warning** staff aim at a team (`POST /api/admin/accounts/:teamAccountId/warn` with `memberScope`) is issued to each person in scope: the same named warning and points on their own record (merit, automatic punishments and appeals as usual). `violations.team_account_id` names the team; each is told it came with the team (as its leader or as a member). The team's record gets `TEAM_LEADER_WARNED` / `TEAM_MEMBER_WARNED`. The catalog row is checked once before anyone is warned; when nobody could be warned → 409 `TEAM_NOBODY_WARNED`.
  - A **forum timeout** on a team goes on each person in scope (same named timeout and clock, checked once first). Members already timed out are left as they are (nobody left → 409 `TEAM_NOBODY_TIMED_OUT`). **Removing team timeouts** ends only timeouts set together with this team (the member's latest `FORUM_TIMEOUT` row carries `viaTeamAccountId`) for the people in scope; others stay (409 `TEAM_NO_LINKED_TIMEOUTS` when none). Team record: `TEAM_LEADER_TIMEOUT(_CLEARED)` / `TEAM_MEMBER_TIMEOUT(_CLEARED)`.
  - **Ban / suspend / lock** change the team account. Staff pick who else gets it (`memberScope`): **team leader** (default; **all members** when the team has no active leader), **specific members** (any active members, leader included) or **all members**. There is no team-only choice: a team penalty always reaches people, so `memberScope: none` or `includeLeader: false` → 422 `TEAM_MEMBER_SCOPE_INVALID`, and staff picking the leader of a leaderless team → 422 `TEAM_NO_LEADER`, both before anything changes. A request without `memberScope` (report decisions, dispute bans, appeal follow-ups) reaches the leader. Each one gets the same named punishment and length, with the reason saying it came with the team. A member already at the same or a stricter standing is left alone. A leader or chosen member staff may not act on (self, staff) stops the whole action before anything changes, so staff leave them out; with **all members** such accounts are skipped and named in the summary. Each member's activity row carries `viaTeamAccountId`; the team's record gets `TEAM_LEADER_STANDING_CHANGED` or `TEAM_MEMBER_STANDING_CHANGED`. Bulk team actions offer each leader / all members (a leaderless team picked with "each leader" fails on its own and is reported).
  - **Lifting** the team (unban / unsuspend / unlock / restore) also lifts the penalty of each member in the chosen scope (the console defaults to all members; a request without `memberScope` reaches only the leader) when it was applied together with this team and is still that member's latest standing change. Other member penalties stay; change them from the Users tab.
- **Team standing gate** (`services/TeamStandingServices.js`). Teams have no session, so `CheckSession` never sees their standing; every team write checks it:

| Team action | Active | Suspended | Locked / Banned | Leader banned, locked or missing |
|---|---|---|---|---|
| Read team, members, reviews; leave (non-owner); decline invite; report; team chat | OK | OK | OK | OK |
| Edit team, delete team, transfer ownership (member side) | OK | **NO** | **NO** | OK |
| Join, accept invite, invite, approve / role / suspend / restore / remove members (deny is OK) | OK | **NO** | **NO** | OK |
| Add funds, distribute funds, contract fund distributions | OK | **NO** | **NO** | **NO** |
| Post team jobs / gigs, team proposals, subcontract hires | OK | **NO** | **NO** | **NO** |
| Live work: team tasks, contract workspace tasks, video projects | OK | OK | **NO** | OK |

  Errors are 403 `TEAM_SUSPENDED` / `TEAM_LOCKED` / `TEAM_BANNED` / `TEAM_LEADER_RESTRICTED`. A penalty whose end date passed counts as over before the minute job records it. Contractual (project) workspaces are client-led and skip the leader rule.
- The team page shows a banner while the team or its leader is restricted (`standing` on `GET /api/teams/:id`), refreshed by `team:standing_changed`.
- A team account has no inbox: status changes, holds, staff credit adjustments and the end of a timed penalty notify the team's active **Owners and Admins** (and push `team:standing_changed` to active members).
- Every mutating team action still checks the **acting user** (Suspended/Ban/Lock members cannot work on team projects, including existing ones).
- **Team record (staff).** The Teams desk reads a team through its people: "Members' warnings & disputes" lists every **current** active member's warnings and disputes (tagged with the member, filterable per member; a member who leaves drops off, their own record keeps everything). **Team merit** is the members' merit added up as a percentage of 100 each (`lib/TeamMerit.js`): five members at 100 → 100%; one of them at 50 → 450/500 = 90%. The same figures replace merit on a team's `CaseAccountSummary` (platform view, case files).
- **Ownership transfer** (`services/TeamOwnershipServices.js`). The **owner** hands the team over from the team page (`PATCH /api/teams/:teamId/transfer-ownership`, `{ accountId, previousOwnerRole: Admin|Member, note? }`; blocked while the team is suspended, locked or banned; the new owner must have room on their plan's team limit, 409 `TEAM_OWNER_LIMIT_REACHED`). A banned or gone **owner**: Admin / Support use **Transfer ownership** (`POST /api/admin/teams/:accountId/transfer-ownership`, `{ newOwnerAccountId, previousOwnerRole: Admin|Member|Removed, reason }`), which works whatever the team's standing. Both: the new owner must be an active member whose own account is Active (409 `TEAM_OWNER_RESTRICTED`); contract workspaces never change owner (422 `TEAM_CONTRACT_WORKSPACE`); the roster rows are locked in one transaction so a team never has zero or two owners; both owners and the team's Admins are told; team chat roles and team video project access follow; open team pages refresh (`team:standing_changed`, `event: 'ownership_transferred'`); `TEAM_OWNERSHIP_TRANSFERRED` is recorded on the team.
- **Team wallet:** the team's own Account Wallet. Members (Owner, Admin, Leader roles) add to it; only the Owner distributes. Staff holds and adjustments work as on member wallets. The desk shows spendable, held, escrow, credits owed to members from contract payouts, and free-to-pay-out.

**Staff:** Admin/Support manage teams (full ladder, wallet, verification, ownership transfer); specialist moderators may warn team members and suspend/lock the team (Forum moderators also time members out); Jobs desk for team-posted jobs. The Teams desk flags teams with a restricted or missing leader, held credits and open disputes.

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
| Open job / gig, owner suspended or locked (or a team whose leader is banned, locked or missing) | **Paused while restricted** (`lib/OwnerAvailability.js`): it leaves browse, and new proposals, invites, offers, gig orders and order confirmations are refused (409 `OWNER_UNAVAILABLE`, nothing charged). Nothing is written, so it comes back by itself when the standing ends. The owner sees "Paused while your account is …" on their own listing. Deactivated owners keep the same rule (`ACCOUNT_DEACTIVATED`). |
| Open job, owner banned | Closed automatically by the ban. Open applicants' proposal fees are refunded and their proposals closed; with no applicants the posting fee is refunded (the jobs engine's own rule). Recorded in `ban_cleanup_items` so it can be restored. |
| Unsigned job offer, either side banned | Withdrawn automatically through the normal reject path; the client's escrow returns to their Account Wallet. While the client is suspended or locked the freelancer cannot sign it (it waits); while the freelancer is unavailable the client cannot send one. |
| Gig, seller banned | Closed automatically; unconfirmed orders are cancelled and the clients notified (no credits are held before confirmation). Recorded for restore. |
| Pending proposals / gig orders by a banned member | Withdrawn automatically so no one can hire them. Proposal fees follow the normal withdraw rule. Never restored. |
| Asset, creator locked or banned | New sales pause and it leaves the public catalog (409 `ASSET_CREATOR_UNAVAILABLE`). Buyers keep and can still assign licenses they own. **Suspended creators keep selling** (a purchase needs no answer). A ban also delists the listing (recorded for restore). |
| Live contract, party suspended, locked or banned | The other side is told (`CONTRACT_PARTY_STANDING`, team counterparties via their Owners/Admins) and told again when the party can act. The contract appears on **Restricted parties** (`GET /api/moderator/restricted-work`; Jobs, Support and Admin consoles) with the escrow it holds, oldest restriction first. Staff settle with the contract and dispute tools; punishment never moves credits. A suspended team keeps working, so its counterparties are not told. |
| Milestone stalled while the freelancer is suspended or locked | The stall notice still goes out (the client can cancel the milestone for a refund), but the **automatic abandonment refund waits** until the penalty ends plus 48 hours. A cancellation request is not auto-approved while its recipient is suspended or locked (plus 48 hours): silence only counts from someone who could answer. Bans do not wait. |
| Review window while suspended, locked or banned | The member could not rate, so the missed-review warning is never issued for a window a penalty touched. |
| DM, credit transfer, team invite, subcontract hire to a restricted member | New DMs to banned/locked members are refused (suspended can still read). Transfers to deactivated, locked or banned wallets are refused (`RECIPIENT_UNAVAILABLE`). Team invites to deactivated/locked/banned members and subcontract hires of anyone unavailable are refused. Discovery browse leaves out banned and locked members; a direct search still finds them with their chip. |
| Paid plan, member banned, locked, suspended or deactivated | They can always see the plan and stop renewal (`/api/subscription/plan-details` and `/api/payment/cancel-subscription` are on every allowlist; card on `/account/appeal`). A **permanent** ban stops renewal itself; the plan runs to the end of the period. |
| Personal or team editor project, Suspend/Ban/Lock | Editor stops. Staff handle any live paid work on the related contract. |

### 9.1 When a ban ends: what comes back

Decision: **the member never needs a ticket to get their work back.**

- **Accepted ban appeal** restores everything the ban closed (jobs, gigs, marketplace listings), by default; staff can untick "Restore what the ban closed" in the decision. The ban still ends on its 24-hour clock; until then the paused gate keeps those items hidden.
- **Unban from the Users desk** offers the same "Restore what the ban closed" option (on by default for unban).
- **Later, item by item**: User & Team → account → *Closed by a ban* (Admin / Support; `GET/POST /api/admin/accounts/:accountId/ban-items[/restore]`). Refused while still banned (409 `ACCOUNT_STILL_BANNED`).
- **An expired temporary ban restores nothing**: the member served it and reposts, as before.
- An item comes back exactly as it was only if nothing changed it since the ban: a job whose application window ended, anything staff put on hold, or a listing staff touched stays closed (the panel says why). Withdrawn proposals, offers and orders never come back; other people moved on and their credits were returned. Posting fees refunded by the ban are not charged again.
- Reversing an unban from the activity log brings the ban back **with** its clean-up.

### 9.2 Teams

- **Leader banned or locked**: the team's open jobs and gigs pause (gate above), it cannot take new work or pay out, live contract work continues. Its Owners and Admins are told, including that **no ticket is needed**: the Teams desk already flags the team and Support transfers ownership (existing tool), or the team resumes by itself when the penalty ends (they are told then too). A leader's suspension does not pause the team.
- **Team account banned**: same clean-up, record and restore as a member (restore from the team's overview, unban option, or an accepted appeal).
- **Non-leader member restricted**: the team is unaffected; the member cannot act, and team payouts owed to them stay owed.

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

**On the spot (platform view → Moderate).** Staff who see something while browsing can act without a report, from the console, never the member page:
- **Same ladder, same catalog.** Named warning or punishment, case notes of 10+ characters, and the desk rules of §4.8. The punishment row must be on the issuer's desk, and specialists cannot make a suspension or timeout open-ended.
- **Area.** Admin and Support act anywhere. A specialist acts on their own product's items and on profiles and teams; on another desk's item they can review but not act (User & Team stays open to them as before). Dispute pages are read-only: the dispute decision owns those penalties.
- **Evidence.** The item's text, state and page are saved with the penalty before anything changes, and the appeal case shows them to the reviewer.
- **No double hits.** A standing action on the same account in the last 10 minutes, or on the same item that day, asks for "Act anyway". One quick action per account runs at a time. Open reports on the item are listed before and after, so the report desk closes them instead of penalising again.
- **No downgrades.** A suspension or lock never replaces a ban or lock from here; an existing suspension or timeout is changed in User & Team.
- **Content first.** Hiding, removing, delisting or pausing runs before the account action. A failed content action stops everything; a failed account action after it is reported as partial.

---

## 11. Visibility

**Public** (`/profile/:id`, job/gig/asset author chips, **forum posts, comments, group members and group owner**): chips for Banned / Suspended / Locked / Timeout (`StandingChip`, data from `publicStandingSql` in `lib/OwnerAvailability.js`: `author_identity.standing` on forum payloads, `client_standing` / `sellerStanding` / `creator_standing` on listings). Chips follow the current standing, so they disappear when the penalty ends. Under dispute stays on the profile's Disputes tab. Star ratings and badge pins are the other systems. Visitors do not see badges while the account is Banned, Locked or in Frozen access (`badgesHidden`); the owner and staff still do.

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

- Every standing action — warn, timeout, suspend, lock, ban, restore, pardon, rescind, credit adjustment — refuses to act on the actor's own account, and only an Admin may act on another staff account (`assertCanSanctionTarget` in `backend/lib/SuspendGuards.js`). For a team target the same check runs on the team leader before anything changes when the action reaches the leader.
- Team targets go through `services/TeamSanctionServices.js` from `warnAccount` and `updateAccountStatus`, so every path (Users desk, platform view, report decisions, dispute conviction bans) treats a team the same way (§8.10).
- Status changes must match the current standing: unsuspend only lifts a suspension, unlock a lock, unban a ban. A banned account can only be changed by Admin or Support, so a specialist moderator cannot lift a ban through unsuspend/unlock or a suspension.
- The automatic suspension never writes Suspended over a ban or lock, and never shortens a suspension already running.
- Every ban (Users desk, dispute conviction, report sanction, appeal follow-up, activity reversal back to Banned) runs `closeBannedAccountListings` (`backend/services/BanCleanupServices.js`) after the ban is saved: see §9 for what closes. Each item is its own transaction and each closed job, gig and listing is recorded in `ban_cleanup_items` (migration `1830800000000_ban-cleanup-items`) with its previous status; failures are reported in the staff response and the `ACCOUNT_BAN_CLEANUP` activity row and never undo the ban. A permanent ban also stops plan renewal. Restoring is §9.1 (`services/BanRestoreServices.js`, activity `ACCOUNT_BAN_RESTORE`). Locks and suspensions do not run it; the paused gate covers them.
- Report decisions follow the same role rules: specialist moderators may warn, suspend or lock from a report, Forum Moderators (and Admin/Support) may also time out from a forum report, and only Admin/Support may ban. A report is claimed for its decision before the sanction runs, so a double submit cannot sanction twice. The case shows the reported member's standing, recent warnings, restrictions, activity, other reports and (forum reports) forum footprint, and the forum desks can take the reported discussion, comment or group down from the case; that does not decide the report.
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
