# Ensemble Platform Merit

This is the operating contract for the reliability score. One number, 0–100, on every user account, wired into jobs, proposals, gigs, orders, contracts, dashboard, disputes, asset marketplace, discovery, forums, teams, projects/editor, inbox/calls, credits/wallets/cashout/subscriptions, profile/verification, tickets/reports, and notifications.

Staff never type the number. They issue a punishment. The engine writes the score. Backend enforces every band lock in this file. Frontend only displays it.

Star ratings stay separate. Stars answer “was the work good?” Merit answers “can we trust this account?”

Related contracts:

- [Punishment system](punishment-system.md) — warnings, timeouts, suspensions, locks, bans. Punishment takes merit.
- [Badge system](badges-system.md) — milestones. Badges never change merit. Merit never deletes badges.

---

## Contents

1. How merit connects to the other systems
2. Who this applies to
3. Starting state
4. Score (0–100)
5. How merit goes up
6. How merit goes down
7. Floor, freeze, banned display
8. Automatic bands
9. Direct answers
10. Per-product earning and band limits
11. Live work already in progress
12. Visibility
13. Flows and examples
14. Anti-abuse and implementation

---

## 1. How merit connects to the other systems

```
event on any Ensemble product
        │
        ▼
 staff or system issues a PUNISHMENT
 (see punishment-system.md)
        │
        └──► MERIT IS TAKEN immediately
                    │
                    ▼
         merit crosses a band
                    │
                    ▼
         extra AUTOMATIC LIMITS apply
         on jobs, gigs, assets, discovery,
         teams, chat, forums, cashout
         These limits are not a second punishment.
         They do not take more merit.
                    │
                    ▼
         user recovers by waiting out the punishment
         + completing clean work on jobs/gigs/assets
                    │
                    ▼
         merit rises, limits lift by themselves
```

**Yes: punishment takes merit.** Warning, timeout, suspend, temp ban, lost dispute, confirmed no-show all subtract merit in the same action. A lock does not (investigation, not guilt). A notice does not. Amounts live in §6 and in the [punishment ladder](punishment-system.md).

**Yes: low merit then takes away features** across the products below, even if staff never return.

**No death spiral.** Automatic band limits never create a new warning, never auto-ban, and never subtract more merit.

---

## 2. Who this applies to

| Actor | Merit ring | Notes |
|---|---|---|
| Guest | No | Browse only. Must sign up to be scored. |
| User account (enthusiast / freelancer / client — same account) | Yes | One score covers every role. A person is not a “freelancer merit” and a “client merit.” |
| Team account | No ring | Acting **user** still needs merit to perform the action. A Frozen member cannot post a team job. |
| Staff | No public ring | Staff `performanceScore` on moderation is workload, not this system. |

Ensemble roles (enthusiast, freelancer, client) are how people use the site, not separate scores. Completing work as a freelancer still raises the same number that a client sees.

Subscriptions (Free / Premium / Business) never buy merit and never skip a band.

Punishments and badges for these actors: [punishment-system.md](punishment-system.md) §2 and [badges-system.md](badges-system.md) §2.

---

## 3. Starting state

| Field | New user |
|---|---|
| Merit | **50** |
| Band | Established (50–74) |
| Access | Full. New is not a crime. |

**50 is the join score.** Not 0 (that would Frozen a brand-new account) and not 100 (a first warning would not matter). Admin `defaultUserMerit` is clamped to 50–74 so new users always start Established.

Missing merit is treated as **50**, never 100. Team rows store `0` and do not show a ring.

Standing starts Active with no punishments — that is the [punishment system](punishment-system.md). Pending Alpha Tester is the [badge system](badges-system.md).

Low merit does **not** issue a timeout, suspension, lock, or ban. Those are staff (or 3-warning auto-suspend) actions. Low merit only applies the automatic product limits in §8.

---

## 4. Score (0–100)

Live reliability score on `/profile` and `/profile/:id`. Red at 0, yellow-orange at 50, green at 100. Cached on `accounts.merit_score`.

`MeritServices.recomputeAccountMerit(accountId)` is the only writer.

---

## 5. How merit goes up (earned on real products)

| Action | Where it happens | Merit |
|---|---|---|
| First successful job contract or gig order close | `/contracts`, `/gigs/orders`, `/dashboard` | **+5** |
| Completions 2–10 | same | **+1.5** each |
| Completions 11+ | same | **+0.2** each, cap **+20** from completions |
| Reviews, Bayesian (3.0★ = 0, 5.0★ = +15) | Rate/review on dashboard after close | **+0 to +15**. Zero reviews = 0 |
| Identity verified | `/account-verification-status` | **+6** |
| Account age | signup timestamp | **+1 per 60 days**, cap **+4** |
| Warning expires or is rescinded | Record | that warning’s hit is **returned** |
| Suspension ends | standing | the **−15** suspend hit is returned |
| Timeout ends | forums | the extra **−5** is returned |

Successful close means the contract or gig order actually completed, not cancelled, not expired-without-hire, not refunded-without-delivery.

Asset **sales** do not add completion points. They grant creator badges ([badges-system.md](badges-system.md)). Reviews of work add review points; asset comments are not ratings.

---

## 6. How merit goes down (punishment takes it)

Every row except Lock and Notice takes merit **and** applies its access lock in the same action. Access locks themselves are the [punishment system](punishment-system.md). This table is the score formula.

| Event | Merit taken | Hit lasts until |
|---|---|---|
| Warning, 1 point | **−8** | 30 days or rescinded |
| Warning, 2 points | **−16** | 60 days or rescinded |
| Warning, 3 points | **−24** | 90 days or rescinded |
| 3rd active warning | warning hit + suspend hit | auto-suspend **7 days** (standing, not a band) |
| Forum timeout | **−5 extra** on top of the warning | timeout active |
| Suspension | **−15** | while suspended |
| Lock | **0** | — |
| Temporary ban | **−25**, then freeze | while banned |
| Permanent ban | freeze (do not keep draining) | until pardon/restore |
| Dispute: this account at fault | **−15** | 12 months |
| No-show / fake delivery (staff-confirmed `work` warning) | **−10** | 90 days |
| Pardon | all punishment hits cleared | immediate |

Default warning is 1 point = **−8** for 30 days.

Same event, two labels → **larger hit only**, not both. A no-show issued with a 2-point warning takes **−16**, not **−16 and −10**.

Open disputes take **no** merit. The public “Under dispute” chip is the signal until staff decide.

---

## 7. Floor, freeze, banned display

Merit cannot go below **0** or above **100**.

Banned / locked: last score is frozen. Public profile shows the standing chip, not a performance grade. After appeal lift (+24h), recompute from leftover hits, then apply bands.

---

## 8. Automatic bands

Bands are automatic. Checked on every recompute. Crossing a band is **not** a new warning and is **not** a punishment.

Standing is evaluated **before** bands. A Trusted user who is suspended still cannot write. A Frozen user who is Active can still finish a live contract. Full order: [punishment-system.md](punishment-system.md) § Enforcement order.

### 8.1 75–100 Trusted / Veteran

Nothing taken. Full access on every product. Talent discovery may add up to **+10** later. No fee discounts.

### 8.2 50–74 Established

Default. Full access. New users live here.

### 8.3 35–49 Watch

Still allowed to work. Quietly deprioritized.

- Cannot create **urgent** job posts (`is_urgent`).
- New marketplace listings always queued for staff review, even if global listing review is off.
- Buried in Talent Discovery and Job Discovery (no boost, treat as a penalty).
- Owner banner on profile, jobs create, gigs create, asset editor.

Still allowed: normal jobs, apply, gigs, chat, cashout, teams, forums (unless timed out), editor, buy assets, buy credits.

### 8.4 20–34 Restricted

Unreliable. Current work is protected. New work is throttled.

- Cannot post **any** new jobs (`/jobs/create`, `/jobs/create/team`).
- Cannot create **any** new gigs (`/gigs/create`).
- Cannot publish **any** new marketplace listings (drafts stay drafts).
- Job proposals capped at **3 per calendar day**.
- Cannot accept a **new** team invite. Existing memberships stay.
- Cashout hold **+7 extra days**.
- Hidden from featured / discovery ranking slots. Direct profile and listing URLs still work.
- Owner banner: new posts, gigs, and listings locked until merit is 35.

Still allowed: finish live contracts and gig orders, message those threads, leave reviews on closable work, tickets, disputes on existing work, read forums, edit profile, use the editor on personal projects, buy credits, buy assets, view dashboard.

Existing open jobs / gigs / listings are **not** auto-deleted.

### 8.5 0–19 Frozen

Trust is gone. **Frozen is a merit band, not a standing.** It is not a timeout, not a suspension, and not a ban. Staff can still suspend/timeout/ban on top. Ban is never automatic from this number.

Everything in Restricted, plus:

- Cannot apply / propose at all.
- Cannot send **new** DMs or create new inbox conversations. Existing **job / gig / contract / order** threads stay open.
- Cannot write forums (posts, comments, reactions, new groups).
- Cannot cash out until merit is **20+**. Balance is not seized.
- Removed from all discovery surfaces.
- Cannot start new editor **team** projects. Personal projects stay.
- Staff get a one-time Frozen alert on the moderation queue. Freeze is automatic. Ban is not.

Still allowed: log in, finish live contracts/orders, view tickets/disputes, file support tickets and appeals, edit profile, read the site, use personal video projects, buy credits to fund a live obligation.

Badges stay on the account but are hidden on the public profile while Frozen ([badges-system.md](badges-system.md)).

### 8.6 Band change is not a punishment

50 → 32 is Restricted limits only. No new warning. 32 → 35 lifts Restricted by itself. Notify on every band change, up or down.

---

## 9. Direct answers

**If merit goes down a lot?** Bands in §8 fire across jobs, gigs, assets, discovery, teams, chat, forums, and cashout.

**If they are punished, is merit taken too?** Yes, except lock and notice. Amounts in §6.

**If merit is too low, what happens?** Automatic product locks in §8 and §10. Not an auto-ban. Not an auto-suspend. Auto-suspend is **3 active warnings** only — that is punishment, not a band.

**Can they buy merit?** No. Not with credits, not with Premium/Business.

**Are badges removed when merit tanks?** Not deleted. Hidden on the public profile while Frozen (and while Banned or Locked). See [badges-system.md](badges-system.md).

---

## 10. Per-product earning and band limits

Each subsection is: where it lives, how merit is earned, what the band does. How a punishment starts on that product: [punishment-system.md](punishment-system.md). Badge triggers: [badges-system.md](badges-system.md).

Standing always wins over bands. Evaluate guest → deleted → ban/lock → suspend → timeout → **then** these band limits.

Legend for the band matrix: **OK** = allowed. **NO** = blocked.

| Action | Route / surface | Watch 35–49 | Restricted 20–34 | Frozen 0–19 |
|---|---|---|---|---|
| Browse jobs, gigs, assets, forums, profiles | `/jobs`, `/gigs`, `/assets`, `/forums`, `/profile/:id` | OK | OK | OK |
| Post a normal job | `/jobs/create` | OK | **NO** | **NO** |
| Post an urgent job | `/jobs/create` + `is_urgent` | **NO** | **NO** | **NO** |
| Post a team job | `/jobs/create/team` | OK (Watch rules) | **NO** | **NO** |
| Edit / extend / expire own job | `/jobs/edit/:id`, extend window | OK | OK (existing) | OK (existing) |
| Apply / send proposal | `/jobs/:id/make-proposal` | OK | 3/day | **NO** |
| Hire / send offer / accept proposal | `/jobs/proposals/...` | OK | OK | OK on **existing** post |
| Create a gig | `/gigs/create` | OK | **NO** | **NO** |
| Order a gig (as client) | `/gigs/services/:id/order` | OK | OK | OK |
| Accept / deliver a gig order | `/gigs/orders/...` | OK | OK | OK (existing) |
| Publish a marketplace listing | asset editor | review queue | **NO** | **NO** |
| Buy an asset | `/assets/:assetId` | OK | OK | OK |
| Comment on an asset | asset details | OK | OK | **NO** |
| Talent / job discovery ranking | `/discovery`, job cards | buried | hidden from featured | removed |
| Create forum group / post / comment / react | `/forums` | OK | OK | **NO** |
| Read forums | `/forums` | OK | OK | OK |
| New DM / new inbox group | `/inbox` | OK | OK | **NO** |
| Message existing job/gig/contract thread | inbox, contract chat | OK | OK | OK |
| Calls / Google Meet | inbox | OK | OK | existing threads only |
| Create a team | `/teams` | OK | **NO** | **NO** |
| Join a team (accept invite) | `/teams/join/:code` | OK | **NO** | **NO** |
| Work on existing team | `/teams/:id`, `/team-project/:id` | OK | OK | OK |
| Personal video project / editor | `/projects`, `/projects/open/:id` | OK | OK | OK |
| New shared/team editor project | `/projects/select` | OK | **NO** | **NO** |
| Buy credits / subscribe | `/credits`, `/credits/checkout` | OK | OK | OK |
| Cash out | settings wallet | OK | +7 day hold | **NO** |
| File a dispute on existing work | `/contracts/dispute-form` | OK | OK | OK |
| File a report | in-product report | OK | OK | OK |
| Support ticket | `/support/ticket` | OK | OK | OK |
| Rate / review after close | `/dashboard/rate` | OK | OK | OK |
| Claim a badge | `/notifications` | OK | OK | OK (stays hidden public) |
| Joed profile intro | `/profile` | OK | OK | OK |
| Identity verification | `/account-verification-status` | OK | OK | OK |

Guests: every mutating row is **NO**. Timeout / Suspended / Ban / Lock columns: [punishment-system.md](punishment-system.md) § Standing matrix.

### 10.1 Account, profile, settings, verification

**Routes:** `/signup`, `/login`, `/profile`, `/profile/:id`, `/settings`, `/account-verification-status`, `/account/appeal`

- Signup writes merit **50**.
- Profile shows the ring. Copy must say Platform Merit is reliability, **not** “accumulated total of N reviews.” Reviews are the stars next to it.
- Identity verification **+6**. Failed verification does not take merit. Fraudulent ID is an `identity` warning (and usually a lock or ban) — that hit is punishment.
- Email verification is not merit.
- Deactivate is voluntary, not a punishment, not a merit hit. 72h reactivation rule stays.

### 10.2 Home, search, discovery

**Routes:** `/home`, `/search/user/:query`, `/discovery`, `/discovery/:tab`

- Home featured jobs use Job Discovery. Watch clients’ new posts rank worse. Restricted/Frozen cannot create new posts, so they fade out of featured naturally.
- User search may show the ring and public standing chips. Never warning text.
- Talent Discovery today mislabels star rating as `meritScore`. That name must become `overallRating`. Platform Merit is a **modifier** only: +0–10 at 75+, penalty at Watch, excluded at Frozen.
- Job Discovery stays primarily client stars + freshness + completeness + availability. Add client merit as a small modifier later. Urgent jobs from Watch+ accounts are already blocked at create time.

### 10.3 Jobs and proposals

**Routes:** `/jobs/postings`, `/jobs/create`, `/jobs/create/team`, `/jobs/edit/:id`, `/jobs/my-job-post`, `/jobs/applied`, `/jobs/saved-posts`, `/jobs/:id/make-proposal`, `/jobs/proposals/...`, application window extend/expire

**Earn:** successful job **contract** close (either party) counts as a completion.

**Band effects:**

- Watch: urgent preset disabled on create/edit. Application window presets (12h/24h/3d/7d/14d) still work.
- Restricted/Frozen: create job returns 403. Existing Open posts stay Open so applicants are not stranded. Owner may still expire-now / close and handle incoming proposals on that post.
- Restricted applicant: 3 proposals per UTC day. Count all jobs, including team proposals.
- Frozen applicant: proposal create 403.

Proposal submission fees (credits) are charged only when the proposal is **accepted by the backend**. A blocked proposal must not take credits.

### 10.4 Gigs and orders

**Routes:** `/gigs/services`, `/gigs/create`, `/gigs/edit/:id`, `/gigs/my-services`, `/gigs/services/:id/order`, `/gigs/orders/...`

**Earn:** successful gig **order** close counts as a completion for freelancer and client.

**Band effects:**

- Restricted/Frozen cannot create new gigs.
- Watch and Restricted **sellers**: existing gigs remain orderable.
- Frozen **seller** cannot accept **new** incoming orders; those orders stay pending until they recover or decline by timeout. Live orders already accepted must stay deliverable (§11).
- Clients at any merit band may order a gig, including Frozen clients (they can still spend to finish a need). Suspended / Ban / Lock still block the write — that is standing, not a band.

### 10.5 Contracts, dashboard, reviews

**Routes:** `/contracts`, `/contracts/:id`, `/dashboard`, `/dashboard/tasks`, `/dashboard/review`, `/dashboard/rate`, `/dashboard/archived`

This is the completion engine. Milestone delivery, accept, close, and `RateReviewModal` live here.

- Close → `recomputeAccountMerit` both parties → badge evaluate freelance/client tracks.
- Rating insert → recompute the **rated** account only.
- Cancelled / expired-without-hire / refund-without-delivery: **no** completion points. No extra merit hit in v1 unless staff issue a `work` warning (no-show).
- Frozen/Restricted users **must** still be able to deliver, accept milestones, and rate on **open** contracts. Blocking that would trap counterparties’ escrow.

Dashboard itself is never hidden. Buttons that would start **new** work (create job/gig) follow the matrix.

### 10.6 Disputes

**Routes:** `/contracts/dispute-form`, `/contracts/disputes`, `/disputes/:id`

- Opening a visible dispute: public **Under dispute** chip. **No merit change.**
- Respondent found at fault: **−15** and whatever standing staff chose.
- Filer found to be abusing disputes: `work` or `conduct` warning on the **filer**, not an automatic −15.
- Frozen/Restricted may file a dispute on **existing** work.
- Escrow release / refund stays a staff action. Merit never moves credits.

### 10.7 Asset marketplace

**Routes:** `/assets`, `/assets/owned`, `/assets/purchased`, `/assets/saved`, `/assets/:assetId`

**Earn:** publishing does **not** add merit completions. It grants creator badges at 1/10/50/100 **published** assets. A 5-star work review still feeds review points.

**Band effects:**

- Watch: publish goes to pending review.
- Restricted/Frozen: cannot publish. Drafts remain. Existing published listings stay for buyers unless staff unpublish after a marketplace punishment or ban.
- Anyone Active except Frozen can comment. Frozen cannot comment (spam risk).
- Buy: allowed at all merit bands. Suspended/Ban/Lock cannot buy.
- Purchased originals stay accessible to the buyer even if the creator is later banned (entitlement already granted).

Listing fees: charge only when the listing is actually accepted into pending/published. A 403 publish must not take credits.

### 10.8 Credits, wallets, cashout, subscriptions, transactions

**Routes:** `/credits`, `/credits-subscriptions`, `/credits/checkout`, `/transactions`, settings wallet

- Buying credits and managing a subscription: allowed at every merit band. Blocked only by Suspended / Ban / Lock.
- Cashout: Watch normal; Restricted **+7 day extra hold** on top of `escrowHoldDays` / payout rules; Frozen **blocked**. Minimum payout and verified-user rules still apply.
- Merit is not a fee coupon. `feeSettings` stay as configured.
- Wallets are never seized by a band. Ban may freeze payouts; support handles leftover balances.
- Team wallets: the **acting user** must be allowed to cash out. Frozen owner cannot cash out the team wallet. Another Active admin/owner of the team can, if team permissions allow.
- Transactions history is always readable at every merit band (Ban/Lock is standing).

### 10.9 Forums

**Routes:** `/forums`, `/forums/group/:id`, `/forums/discussion/:postId`

**Earn:** none. Forums do not add merit.

**Band effects:**

- Frozen: write block even without a timeout.
- Restricted: forums still writable (community is not the reliability problem). If they also have a timeout, timeout wins.
- Creating groups: Frozen **NO**.

### 10.10 Teams, team jobs, business verification

**Routes:** `/teams`, `/teams/:id`, `/teams/join/:code`, `/teams/:id/business-verification`, `/teams/:id/tasks/:contractId`, `/team-project/:id`

- Teams have **no** merit ring. Business verification is not +6 (that is personal KYC only).
- Every mutating team action checks the **acting user**: Watch/Restricted/Frozen as in the matrix.
- Restricted/Frozen cannot create a team or accept a new invite. They remain on teams they already joined so projects do not lose an editor mid-job.
- Team job create uses the acting user’s merit, not an average of members.
- Team task workspace for an **existing** contract stays open for Restricted/Frozen members (live work).

### 10.11 Projects and video editor

**Routes:** `/projects`, `/projects/personal`, `/projects/shared`, `/projects/team`, `/projects/select`, `/projects/open/:projectId`

The editor is a creative tool, not a marketplace trust surface.

- Personal projects: allowed at all merit bands. Blocked only by Suspended / Ban / Lock.
- New shared or team projects: Restricted/Frozen **NO**. Existing shared/team projects they already belong to: **OK** so production is not stranded.
- Editor file uploads follow the same write rules as the project they belong to.
- Joed / AI tools inside the editor follow the same standing write rules. Merit bands do not add a special AI lock.

### 10.12 Inbox, chat, calls, meetings

**Routes:** `/inbox/*`

Conversation kinds: direct, group, job, gig, marketplace.

- New DM / new group: Frozen **NO**. Restricted OK.
- Threads tied to an **open job, gig order, contract, or purchase**: Frozen **OK** (counterparties must be able to talk).
- Calls and Google Meet: same as messaging on that thread.
- Group member limits stay subscription-based, not merit-based.

### 10.13 Notifications

**Route:** `/notifications`

- Band change notifies here and via socket (`account:restricted` and related).
- Claim badge: allowed at every merit band. Frozen may claim; public profile still hides badges until they leave Frozen. Suspended/Ban/Lock still block the write.

### 10.14 Support, tickets, reports, Joed, legal, landing

**Routes:** `/support/ticket`, `/landing/*`, in-product reports, Ask Joed

- Support tickets: all merit bands. Suspended/Ban/Lock follow standing rules, not bands.
- Product reports (user, job, gig, asset, forum): Frozen OK. Filing a report is not a violation and takes no merit.
- Joed / Ask Our Chatbot: read help always. Actions Joed claims must still hit the same backend locks. Do not put this spec into `backend/data/` until it ships (`backend/data` is current-behavior only).
- Legal/landing pages: no merit effect.
- Feedback (`/landing/SendAFeedback`): same as tickets.

### 10.15 Admin and moderator desks

Every desk’s Restrictions view must show **current merit, band, and what is already auto-locked** so staff do not “double punish” a Frozen user with a pointless extra warning unless new harm happened.

Admin users table shows the live integer, not a fake 50 forever. `meritChange` must not be labeled as a currency.

Analytics tiers must match §8. Who can punish: [punishment-system.md](punishment-system.md). Who can grant badges: [badges-system.md](badges-system.md).

---

## 11. Live work already in progress

When merit changes, **do not strand the other party or their credits.** Standing changes (suspend/ban) have their own table in [punishment-system.md](punishment-system.md).

| Situation | What happens |
|---|---|
| Open job, owner becomes Restricted/Frozen | Job stays Open. Owner cannot create another. They can still hire from existing proposals or expire/close. |
| Applicant Frozen after sending a proposal | Proposal stays. Client may still hire. If hired, Frozen user **must** be able to do the contract. |
| Live contract / gig order, either party Frozen or Restricted | Delivery, milestones, chat on that thread, and close/rate stay allowed. |
| Published asset, creator Frozen | Existing listing remains buyable until staff unpublish. Creator cannot publish new ones. Buyers keep purchased originals. |
| Team project, member Frozen | They keep access to that project. Cannot join new teams. |
| Personal editor project, any merit band | Stays. Only Suspend/Ban/Lock stop the editor. |

---

## 12. Visibility

**Public** (`/profile/:id`, job/gig/asset author chips): merit ring (users only), stars, public standing chips. Badge pins are separate ([badges-system.md](badges-system.md)).

**Owner:** Record modal — merit breakdown (what added, what was taken, when it returns), **current band and the product locks in effect**. Standing and warnings in the same modal come from the punishment system.

**Never public:** warning text, points, staff names, case IDs, the numeric hit list.

**Counterparties** on a job/gig/contract see the ring and public chips only.

---

## 13. Flows and examples

### New user across products

```
signup → merit 50, Established
verify identity → 56
first gig close → ~61
```

Badge grants that fire on the same path: [badges-system.md](badges-system.md).

### Warning on forums that hits jobs

```
Forum mod warns (conduct, 1pt) + timeout
  → merit 50 − 8 − 5 = 37 Watch
  → cannot post urgent jobs, listings go to review
  → can still take gig orders and write proposals
timeout ends → −5 returns → 45, still Watch until the warning’s 30 days end → 50
```

### Jobs no-show

```
Jobs mod issues work warning 2pt (same event as no-show → take −16, not −16 and −10)
  → 50 − 16 = 34 Restricted
  → cannot post jobs or create gigs, 3 proposals/day, cashout +7 days
  → live contract still deliverable
```

### Frozen then they finish work

```
merit 12 Frozen
they deliver a live gig (+5) and get a 5★ review
  → completions and reviews push them over 20
  → apply/propose and cashout unlock
  → still Restricted until 35
  → no staff action required
```

### Team job while Watch

```
user at 40 Watch
  → can open /jobs/create/team
  → urgent toggle disabled
  → if they later drop to 32, they cannot create another team job
  → the Open team job they already posted stays
```

---

## 14. Anti-abuse and implementation

- Users cannot rate themselves. Bayesian prior damps thin histories.
- Completions = successful close only.
- Staff cannot `UPDATE merit_score`. They punish or pardon. `MeritServices.recomputeAccountMerit(accountId)` is the only writer.
- Recompute is idempotent and server-side. Never compute the official score in React.
- Same event, two labels → one merit hit (the larger).
- Automatic Frozen never closes live contracts and never seizes wallets.
- Proposal and listing fees are not charged on a rejected action.
- Band limits need backend guards on the routes in §10, same style as `CheckSession` standing checks.
- Align `accounts.merit_score` default to 50. Hide the ring on teams.
- Discovery must stop calling stars `meritScore`.

Build order (merit slice):

1. Copy, 50-not-100, hide team ring.
2. Punishment → merit hits (depends on [punishment-system.md](punishment-system.md) shipping the ladder).
3. Completions / reviews / verification add merit.
4. Backend guards for every band row in §10.
5. Discovery modifier for 75+ and burial for Watch+.

`MeritServices.recomputeAccountMerit` is the score writer. Band guards live on job/gig/proposal/asset/forum/DM/team/cashout writes. Restricted extra cashout hold (+7 days) is specified; live cashout still pays immediately except Frozen, which is blocked.
