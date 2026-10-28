# How Platform Merit Works

Platform Merit is Ensemble’s **reliability score**. It is one number, **0–100**, on every **user** account.

- **Stars** answer: “Was the work good?”
- **Merit** answers: “Can we trust this account?”
- **Standing** (Active / Timeout / Suspended / Locked / Banned) answers: “What is locked right now?” See [punishment-system.md](punishment-system.md).
- **Badges** answer: “What have they earned?” Badges never change merit. Merit never deletes badges. See [badges-system.md](badges-system.md).

Staff never type the number. They issue a **warning** (or rescind / pardon one). The engine writes the score. Timeout, suspend, lock, and ban lock access; they do not take merit. The backend enforces every band lock. The frontend only displays it.

You cannot buy merit with credits, Premium, or Business. Subscriptions never skip a band.

---

## Contents

1. [The 60-second version](#1-the-60-second-version)
2. [Who has a ring](#2-who-has-a-ring)
3. [Why new users start at 50](#3-why-new-users-start-at-50)
4. [How the score is calculated](#4-how-the-score-is-calculated)
5. [How merit goes up](#5-how-merit-goes-up)
6. [How merit goes down](#6-how-merit-goes-down)
7. [Bands: what low merit actually does](#7-bands-what-low-merit-actually-does)
8. [How to earn it back](#8-how-to-earn-it-back)
9. [What is allowed in each band](#9-what-is-allowed-in-each-band)
10. [Per-product notes](#10-per-product-notes)
11. [Live work already in progress](#11-live-work-already-in-progress)
12. [Visibility](#12-visibility)
13. [Worked examples](#13-worked-examples)
14. [What is live vs still specified](#14-what-is-live-vs-still-specified)
15. [Implementation](#15-implementation)

---

## 1. The 60-second version

```
You join at 50 (Established). Full access.

You do real work, get reviews, verify identity, stay longer
        → merit goes up.

Staff issue a warning (always temporary)
        → points 1–10 set both the merit hit and how long it lasts
        → 5 points is a minor 14-day Watch-level slap
        → merit goes down and may cross into Watch, Restricted, or Frozen

Timeout, suspend, lock, and ban do not take extra points.
A timeout without a warning does not move merit at all.

Crossing a band throttles products automatically
(forums, marketplace, jobs, gigs, editor sharing, inbox).
It is NOT a new staff warning and NOT a ban.

Finish live work + wait out (or rescind) warnings
        → the engine rebuilds the number
        → limits lift by themselves.
```

**No death spiral.** Being Frozen does not take more merit, does not auto-ban you, and does not seize your wallet.

---

## 2. Who has a ring

| Actor | Merit ring | Notes |
|---|---|---|
| Guest | No | Browse only. Must sign up to be scored. |
| User account (enthusiast / freelancer / client — same account) | Yes | One score covers every role. There is no separate “freelancer merit” and “client merit.” |
| Team account | No ring | The **acting user** is still checked. A Frozen member cannot post a team job. Teams store `0` and should not show a ring. |
| Staff | No public ring | Staff `performanceScore` on moderation is workload, not this system. |

---

## 3. Why new users start at 50

| Field | New user |
|---|---|
| Merit | **50** |
| Band | Established (50–74) |
| Access | Full. Being new is not a crime. |

**50 is the join score on purpose.**

- **0** would Frozen a brand-new account before they did anything.
- **100** would make a first warning almost meaningless.

Admin `defaultUserMerit` is clamped to **50–74** so new users always start Established. Missing merit on a user profile displays **50**, never 100.

Low merit does **not** issue a timeout, suspension, lock, or ban. Those are staff actions (or 3-warning auto-suspend). Low merit only applies the automatic product limits in [§7](#7-bands-what-low-merit-actually-does).

---

## 4. How the score is calculated

This is the part people get wrong: **merit is not deducted like a wallet.**

There is no running balance of “−8, then −5, then +1.5.” Every time something important happens, the engine **rebuilds the number from current facts** and writes it to `accounts.merit_score`.

`MeritServices.recomputeAccountMerit(accountId)` is the **only** writer. Staff cannot `UPDATE merit_score`. They warn, rescind, or pardon; the engine reads leftover warning points and computes again.

### The formula

```
score =
    50
  + completion points          (cap +20)
  + review points              (cap +15, Bayesian)
  + 6 if identity is verified
  + age points                 (+1 per 60 days, cap +4)
  − active warning hits        (points × 2)

then clamp to 0–100
```

**Warnings are the only deduction**, and they always expire. Timeout, suspend, lock, ban, and lost disputes do not subtract points. If staff want merit taken on those actions, they issue a warning at the same time. Permanent warnings are rejected; duration follows the point ladder (staff may shorten, never lengthen past the cap).

Banned and locked accounts **freeze** the last score so it does not keep changing while they cannot work. After an appeal lift, recompute from leftover warnings, then apply bands.

### When recompute runs

Signup, successful contract close (both parties), a new review (the rated account), identity verification, warn, timeout, suspend, ban, pardon, rescind, and when an expired suspension is lifted.

If the result crosses a band, the owner gets a notification (`MERIT_DOWN` or `MERIT_UP`).

---

## 5. How merit goes up

| Action | Where | Points |
|---|---|---|
| First successful job contract or gig order close | `/contracts`, `/gigs/orders`, `/dashboard` | **+5** |
| Completions 2–10 | same | **+1.5** each |
| Completions 11+ | same | **+0.2** each, still capped at **+20** from completions |
| Reviews (Bayesian) | Rate/review after close | **+0 to +15**. Zero reviews = 0. 3.0★ ≈ 0, 5.0★ toward +15 |
| Identity verified | `/account-verification-status` | **+6** |
| Account age | signup timestamp | **+1 per 60 days**, cap **+4** |
| Warning expires or is rescinded | record | that warning’s hit **disappears** on the next recompute |

**Successful close** means the contract or gig order actually completed. Cancelled, expired-without-hire, and refunded-without-delivery do **not** add completion points.

Asset **sales** do not add completion points. They grant creator badges. Work reviews still feed review points. Asset comments are not ratings.

Email verification is not merit. Failed identity verification does not take merit. Fraudulent ID is an `identity` warning (punishment). Deactivate is voluntary, not a merit hit.

---

## 6. How merit goes down

**Only warnings take merit.** Everything else on the punishment ladder locks access and leaves the score alone. Access locks themselves are the [punishment system](punishment-system.md).

| Points | Merit taken | Duration | What it feels like from 50 |
|---|---|---|---|
| 1 | **−2** | 3 days | Slap on the wrist. Still Established. |
| 2 | **−4** | 5 days | Still Established. |
| 3 | **−6** | 7 days | Barely Watch. |
| 4 | **−8** | 10 days | Watch. |
| 5 | **−10** | 14 days | **Minor.** Watch: no urgent jobs, listings go to review. |
| 6 | **−12** | 21 days | Watch. |
| 7 | **−14** | 30 days | Watch, close to Restricted. |
| 8 | **−16** | 45 days | Restricted if they started at 50. |
| 9 | **−18** | 60 days | Restricted. |
| 10 | **−20** | 90 days | Restricted. Stacked 10s can Frozen. |

Staff do **not** type a custom point value. They pick a **predefined warning** below. That row locks the points and the duration. Case notes are free text. There is no permanent warning.

### 6.1 Predefined warnings

Scanned from live report reasons, desks, and products. Severe crime (CSAM, payment theft in progress) is **lock or ban**, not a warning — those 10-point rows exist so merit stays low if the account is later restored.

| Warning | Points | Duration | Merit | Where |
|---|---|---|---|---|
| Off-topic or low-effort flood | 1 | 3 days | −2 | Forums |
| Offensive language | 2 | 5 days | −4 | Conduct |
| Unsolicited spam messages | 2 | 5 days | −4 | Inbox |
| Repeated forum spam | 3 | 7 days | −6 | Forums |
| Inappropriate content | 3 | 7 days | −6 | Conduct, profile |
| Duplicate or spam job post | 3 | 7 days | −6 | Jobs |
| Duplicate or spam gig | 3 | 7 days | −6 | Gigs |
| Spam marketplace listing | 3 | 7 days | −6 | Marketplace |
| Inappropriate profile content | 3 | 7 days | −6 | Identity |
| Staff follow-up / Other (minor) | 3 | 7 days | −6 | Any desk |
| Copyrighted material in forums | 5 | 14 days | −10 | Forums |
| Harassment or bullying | 5 | 14 days | −10 | Conduct, inbox, teams |
| Misleading job details | 5 | 14 days | −10 | Jobs |
| No-show / ghosting after hire | 5 | 14 days | −10 | Jobs |
| Misleading gig or bait-and-switch | 5 | 14 days | −10 | Gigs |
| Misleading listing | 5 | 14 days | −10 | Marketplace |
| Fake team | 5 | 14 days | −10 | Teams |
| Abuse of the dispute process | 5 | 14 days | −10 | Money |
| Harassment in a project | 5 | 14 days | −10 | Editor |
| Other (moderate) | 5 | 14 days | −10 | Any desk |
| Job fee evasion | 6 | 21 days | −12 | Jobs |
| Review manipulation | 6 | 21 days | −12 | Jobs |
| Marketplace fee evasion | 6 | 21 days | −12 | Marketplace |
| Copyright infringement (listing) | 7 | 30 days | −14 | Marketplace |
| Hate speech | 8 | 45 days | −16 | Conduct |
| Sharing private information | 8 | 45 days | −16 | Conduct |
| Scam or phishing in chat | 8 | 45 days | −16 | Inbox |
| Fake job or scam offer | 8 | 45 days | −16 | Jobs |
| Fake delivery or empty work | 8 | 45 days | −16 | Jobs / gigs |
| Stolen gig media | 8 | 45 days | −16 | Gigs |
| Stolen or unauthorized asset | 8 | 45 days | −16 | Marketplace |
| Impersonation | 8 | 45 days | −16 | Identity |
| Refund or chargeback abuse | 8 | 45 days | −16 | Money |
| Other (serious) | 8 | 45 days | −16 | Any desk |
| Threats or violence | 10 | 90 days | −20 | Conduct — also suspend/ban |
| Malware or harmful file | 10 | 90 days | −20 | Marketplace / editor — unpublish |
| Fraudulent identity documents | 10 | 90 days | −20 | Identity — also lock |
| Payment fraud | 10 | 90 days | −20 | Money — also ban |

Points **stack** across active rows. Two 5-point harassment warnings = **−20** until both expire.

| Other event | Merit | Notes |
|---|---|---|
| Forum timeout / suspend / lock / ban | **0** | Access lock only. Prefer a warning on the same action. |
| Dispute opened or lost | **0** | Unless staff also warn. |
| **20+** active warning points | **0 extra** | Short **7-day auto-suspend** (standing cooldown). Default threshold 20. |
| Rescind / pardon | hits returned | Immediate. |

Active warning points **stack**. Two 5-point warnings = **−20** for as long as both are unexpired. A timeout on the same action does not add more.

**Open disputes take no merit.** The public “Under dispute” chip is the signal until staff decide. If they also warn, that warning is the only hit.

---

## 7. Bands: what low merit actually does

Bands are automatic. Checked on every recompute. Crossing a band is **not** a new warning and **not** a punishment.

Standing is evaluated **before** bands. A Trusted user who is suspended still cannot write. A Frozen user who is Active can still finish a live contract. Full order: [punishment-system.md](punishment-system.md) § Enforcement order.

Notify on every band change, up or down. 32 → 35 lifts Restricted by itself. No staff action required.

### Trusted / Veteran — 75–100

Nothing taken. Full access. Talent discovery may add up to **+10** later. No fee discounts.

### Established — 50–74

Default. Full access. New users live here.

### Watch — 35–49

Minor. Typical **5-point** warning from a new user. Still allowed to work. Quietly deprioritized.

- Cannot create **urgent** job posts.
- New marketplace listings always queued for staff review, even if global listing review is off.
- Buried in Talent Discovery and Job Discovery (specified).
- Owner banner on profile, jobs create, gigs create, asset editor.

Still allowed: normal jobs, apply, gigs, chat, cashout, teams, **forums**, personal and shared editor, buy assets, buy credits.

### Restricted — 20–34

Moderate. Typical **8–10 point** warning, or two 5-point warnings. Current work is protected. Community and new supply are throttled — this is the automatic “timeout” across products.

- Cannot post **any** new jobs or create **any** new gigs.
- Cannot publish marketplace listings or **comment** on them.
- Cannot write forums (posts, comments, reactions, new groups). Reading stays open.
- Cannot start a **new shared / team editor** project. Personal projects and live team work stay.
- Job proposals capped at **3 per UTC day**.
- Cannot create a team or accept a **new** team invite. Existing memberships stay.
- Cashout hold **+7 extra days** (specified; see [§14](#14-what-is-live-vs-still-specified)).

Still allowed: finish live contracts and gig orders, message those threads, leave reviews on closable work, tickets, disputes on existing work, read forums, edit profile, use the editor on personal projects, buy credits, buy assets, view dashboard, new DMs.

Existing open jobs / gigs / listings are **not** auto-deleted.

### Frozen — 0–19

Trust is gone. **Frozen is a merit band, not a standing.** It is not a timeout, not a suspension, and not a ban. Staff can still suspend / timeout / ban on top. Ban is **never** automatic from this number.

Everything in Restricted, plus:

- Cannot apply / propose at all.
- Cannot send **new** DMs or create new inbox conversations. Existing **job / gig / contract / order** threads stay open.
- Cannot write forums (posts, comments, reactions, new groups).
- Cannot cash out until merit is **20+**. Balance is **not** seized.
- Removed from all discovery surfaces.
- Cannot start new editor **team** projects. Personal projects stay.
- Staff get a Frozen signal on the moderation queue. Freeze is automatic. Ban is not.

Still allowed: log in, finish live contracts/orders, view tickets/disputes, file support tickets and appeals, edit profile, read the site, use personal video projects, buy credits to fund a live obligation.

Badges stay on the account but are hidden on the public profile while Frozen ([badges-system.md](badges-system.md)).

---

## 8. How to earn it back

There is no “buy your way out” button. Recovery is the same formula running again with better facts.

1. **Wait out (or rescind) warnings.** When a warning expires or is rescinded, that hit is gone on the next recompute. Pardon clears all warning hits immediately. Ending a timeout or suspension does not by itself restore merit.
2. **Finish live work.** A Frozen or Restricted user can still deliver open contracts and gig orders. Completions add points and can push them over 20 or 35 without staff.
3. **Get honest reviews.** Bayesian reviews move the score toward +15 as the average and count grow. Thin 5★ histories are damped so one friend cannot inflate the number.
4. **Verify identity** if they have not: **+6**.
5. **Stay.** Age adds +1 every 60 days, up to +4.

Typical path out of Frozen:

```
merit 12 Frozen
they deliver a live gig (+ completions) and get a strong review
  → score crosses 20
  → proposing and cashout unlock
  → still Restricted until 35
  → no staff action required
```

---

## 9. What is allowed in each band

Standing always wins over bands. Evaluate guest → deleted → ban/lock → suspend → timeout → **then** these band limits.

Legend: **OK** = allowed. **NO** = blocked.

| Action | Watch 35–49 | Restricted 20–34 | Frozen 0–19 |
|---|---|---|---|
| Browse jobs, gigs, assets, forums, profiles | OK | OK | OK |
| Post a normal job | OK | **NO** | **NO** |
| Post an urgent job | **NO** | **NO** | **NO** |
| Post a team job | OK | **NO** | **NO** |
| Edit / expire own existing job | OK | OK | OK |
| Apply / send proposal | OK | 3/day | **NO** |
| Hire / accept proposal on an **existing** post | OK | OK | OK |
| Create a gig | OK | **NO** | **NO** |
| Order a gig (as client) | OK | OK | OK |
| Accept / deliver an existing gig order | OK | OK | OK |
| Publish a marketplace listing | review queue | **NO** | **NO** |
| Buy an asset | OK | OK | OK |
| Comment on an asset | OK | **NO** | **NO** |
| Talent / job discovery ranking | buried | hidden from featured | removed |
| Create forum group / post / comment / react | OK | **NO** | **NO** |
| Read forums | OK | OK | OK |
| New DM / new inbox group | OK | OK | **NO** |
| Message existing job/gig/contract thread | OK | OK | OK |
| Create a team | OK | **NO** | **NO** |
| Join a team (accept invite) | OK | **NO** | **NO** |
| Work on an existing team | OK | OK | OK |
| Personal video project / editor | OK | OK | OK |
| New shared/team editor project | OK | **NO** | **NO** |
| Buy credits / subscribe | OK | OK | OK |
| Cash out | OK | +7 day hold | **NO** |
| File a dispute on existing work | OK | OK | OK |
| File a report / support ticket | OK | OK | OK |
| Rate / review after close | OK | OK | OK |
| Claim a badge | OK | OK | OK (hidden public) |
| Identity verification / edit profile | OK | OK | OK |

Guests: every mutating row is **NO**. Timeout / Suspended / Ban / Lock columns: [punishment-system.md](punishment-system.md) § Standing matrix.

---

## 10. Per-product notes

Each product: where it lives, how merit is earned, what the band does.

### 10.1 Account, profile, settings, verification

**Routes:** `/signup`, `/login`, `/profile`, `/profile/:id`, `/settings`, `/account-verification-status`, `/account/appeal`

- Signup writes merit **50**.
- Profile ring copy: “Reliability score. {band} band.” It must **not** say “accumulated total of N reviews.” Reviews are the stars next to it.
- Identity verification **+6**. Failed verification does not take merit.
- Email verification is not merit.

### 10.2 Home, search, discovery

**Routes:** `/home`, `/search/user/:query`, `/discovery`

- Platform Merit is a **ranking modifier**, not a second star rating.
- Talent Discovery today still mislabels star rating as `meritScore` in places. That name should become `overallRating`.
- Specified later: +0–10 at Trusted, penalty at Watch, excluded at Frozen.

### 10.3 Jobs and proposals

**Routes:** `/jobs/create`, `/jobs/create/team`, `/jobs/:id/make-proposal`

**Earn:** successful job **contract** close (either party) counts as a completion.

- Watch: urgent preset disabled.
- Restricted / Frozen: create job returns 403. Existing Open posts stay Open so applicants are not stranded.
- Restricted applicant: 3 proposals per UTC day, all jobs including team proposals.
- Frozen applicant: proposal create 403.
- Guards check the **acting user** (`payer_account_id` / `proposed_by_account_id`), not the team account (team merit is 0).
- Proposal fees are charged only when the proposal is accepted by the backend. A blocked proposal must not take credits.

### 10.4 Gigs and orders

**Routes:** `/gigs/create`, `/gigs/services/:id/order`, `/gigs/orders/...`

**Earn:** successful gig **order** close counts as a completion for freelancer and client.

- Restricted / Frozen cannot create new gigs. Guard uses the acting user’s personal account.
- Watch and Restricted **sellers**: existing gigs remain orderable.
- Frozen **seller** cannot accept **new** incoming orders (specified). Live orders already accepted must stay deliverable.
- Clients at any merit band may order a gig, including Frozen clients. Suspended / Ban / Lock still block the write — that is standing.

### 10.5 Contracts, dashboard, reviews

**Routes:** `/contracts`, `/dashboard`, `/dashboard/rate`

This is the completion engine.

- Close → recompute **both** parties.
- Rating insert → recompute the **rated** account only.
- Frozen / Restricted users **must** still deliver, accept milestones, and rate on **open** contracts. Blocking that would trap counterparties’ escrow.
- Dashboard itself is never hidden. Buttons that start **new** work follow the matrix.

### 10.6 Disputes

**Routes:** `/contracts/dispute-form`, `/disputes/:id`

- Opening a dispute: public **Under dispute** chip. **No merit change.**
- Respondent found at fault: standing as staff chose (usually a ban). **No automatic merit hit.** Staff may also issue a warning if they want points taken.
- Filer abusing disputes: `work` or `conduct` warning on the **filer** — that warning is the merit hit.
- Frozen / Restricted may file a dispute on **existing** work.
- Merit never moves credits. Escrow is a staff action.

### 10.7 Asset marketplace

**Earn:** publishing does **not** add merit completions. It grants creator badges. A 5-star work review still feeds review points.

- Watch: publish goes to pending review.
- Restricted / Frozen: cannot publish. Drafts remain. Existing published listings stay for buyers unless staff unpublish.
- Restricted / Frozen cannot comment. Watch and above can.
- Buy: allowed at all merit bands. Suspended / Ban / Lock cannot buy.

### 10.8 Credits, wallets, cashout, subscriptions

- Buying credits and managing a subscription: allowed at every merit band. Blocked only by Suspended / Ban / Lock.
- Cashout: Watch normal; Restricted **+7 extra hold** (specified); Frozen **blocked**.
- Merit is not a fee coupon.
- Wallets are never seized by a band.
- Team wallets: the **acting user** must be allowed to cash out.

### 10.9 Forums

Forums do not add merit.

- Restricted and Frozen: write block even without a staff timeout. Reading stays open.
- Watch: forums still writable. If they also have a timeout, timeout wins.

### 10.10 Teams and editor

- Teams have **no** merit ring. Business verification is not +6 (that is personal KYC only).
- Restricted / Frozen cannot create a team or accept a new invite. They remain on teams they already joined.
- Team job create uses the acting user’s merit, not an average of members.
- Personal editor projects: allowed at all merit bands. Blocked only by Suspended / Ban / Lock.
- New shared / team editor projects: Restricted / Frozen **NO**. Existing ones they already belong to: **OK**.

### 10.11 Inbox

- New DM / new group: Frozen **NO**. Restricted OK.
- Threads tied to an **open job, gig order, contract, or purchase**: Frozen **OK** (counterparties must be able to talk).

### 10.12 Support, tickets, reports, admin

- Support tickets, product reports, appeals: all merit bands. Filing a report is not a violation and takes no merit.
- Admin Restrictions view should show **current merit, band, and what is already auto-locked** so staff do not double-punish a Frozen user unless new harm happened.
- Analytics tiers must match the five bands.

---

## 11. Live work already in progress

When merit changes, **do not strand the other party or their credits.**

| Situation | What happens |
|---|---|
| Open job, owner becomes Restricted / Frozen | Job stays Open. Owner cannot create another. They can still hire from existing proposals or expire / close. |
| Applicant Frozen after sending a proposal | Proposal stays. Client may still hire. If hired, Frozen user **must** be able to do the contract. |
| Live contract / gig order, either party Frozen or Restricted | Delivery, milestones, chat on that thread, and close / rate stay allowed. |
| Published asset, creator Frozen | Existing listing remains buyable until staff unpublish. Creator cannot publish new ones. |
| Team project, member Frozen | They keep access to that project. Cannot join new teams. |
| Personal editor project, any merit band | Stays. Only Suspend / Ban / Lock stop the editor. |

---

## 12. Visibility

**Public** (`/profile/:id`, job / gig / asset author chips): merit ring (users only), stars, public standing chips. Badge pins are separate.

**Owner:** Record modal — merit breakdown (what added, what was taken, when it returns), **current band and the product locks in effect**. Standing and warnings in the same modal come from the punishment system.

**Never public:** warning text, points, staff names, case IDs, the numeric hit list.

**Counterparties** on a job / gig / contract see the ring and public chips only.

---

## 13. Worked examples

### New user

```
signup                  → 50  Established
verify identity         → 56
first gig close (+5)    → ~61
```

### Warning on forums that hits jobs

```
Forum mod warns (conduct, 5pt) — always temporary, 14 days
  → merit 50 − 10 = 40 Watch
  → cannot post urgent jobs, listings go to review
  → forums and gigs still open
  → timeout is optional standing; it does not take extra merit
warning’s 14 days end → 50 Established again
```

### Jobs no-show

```
Jobs mod issues work warning 8pt (45 days)
  → 50 − 16 = 34 Restricted
  → forums unwritable, no new jobs/gigs/listings, 3 proposals/day
  → live contract still deliverable
```

### Frozen, then they finish work

```
merit 12 Frozen
they deliver a live gig and get a 5★ review
  → completions and reviews push them over 20
  → apply / propose and cashout unlock
  → still Restricted until 35
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

## 14. What is live vs still specified

This is the contract. The engine already shipped the core. A few rows are still spec-only.

### Live now

- Join score **50**, missing score displays **50**, `accounts.merit_score` default **50**, user rows at 0 backfilled to 50 (`1826100000000_merit-default-fifty.js`).
- Staff pick a predefined warning from `backend/lib/WarningCatalog.js` (same list in `frontend/src/lib/warningCatalog.ts`). Points cannot be typed by hand.
- Formula in `backend/lib/Merit.js`: 50 + completions + Bayesian reviews + identity + age − **active warning hits (points × 2)**.
- Warnings are always temporary. Ladder 1–10 points sets duration (3–90 days). Missing expiries backfilled in `1826200000000_warning-temporary-ladder.js`. Lapsed warnings expire on the next session and recompute merit.
- `MeritServices.recomputeAccountMerit` is the only writer. Banned / locked scores freeze unless `force` (used on ban).
- Recompute on signup, contract complete, review, verify, warn, timeout, suspend, ban, pardon, rescind, expired-suspension lift, expired-warning lift.
- Backend guards: create job, urgent job, create gig, proposals (Frozen block + Restricted 3/day), publish asset, Watch listing review, asset comments (Restricted/Frozen), forum writes (Restricted/Frozen), new DMs, create/join team, shared editor invite, cashout (Frozen blocked).
- Guards use the **acting user**, not the team account.
- Profile ring copy: “Reliability score.” Analytics tiers: Frozen / Restricted / Watch / Established / Trusted.
- Band-change notification.

### Specified, not fully wired yet

- Restricted cashout **+7 extra hold** — live cashout still pays on the normal schedule except Frozen, which is blocked.
- Discovery ranking modifier (+10 Trusted, bury Watch, hide Restricted featured, remove Frozen).
- Frozen seller cannot accept **new** incoming gig orders.
- Owner Record modal with a full merit breakdown.
- Hide claimed badges on the public profile while Frozen.
- Hide the ring if a team profile still renders one.
- Talent Discovery still mislabels stars as `meritScore` in places.

---

## 15. Implementation

```
event on any Ensemble product
        │
        ▼
 staff or system issues a WARNING
 (timeout / suspend / ban lock access separately)
        │
        └──► MERIT IS RECOMPUTED from leftover warning points
                    │
                    ▼
         merit crosses a band
                    │
                    ▼
         extra AUTOMATIC LIMITS apply
         These limits are not a second punishment.
         They do not take more merit.
                    │
                    ▼
         user recovers by waiting out the punishment
         + completing clean work on jobs / gigs
                    │
                    ▼
         merit rises, limits lift by themselves
```

### Anti-abuse

- Users cannot rate themselves. Bayesian prior damps thin histories.
- Completions = successful close only.
- Recompute is idempotent and server-side. Never compute the official score in React.
- Only warnings subtract merit. Timeout, suspend, lock, ban, and disputes never add a second hit.
- Automatic Frozen never closes live contracts and never seizes wallets.
- Proposal and listing fees are not charged on a rejected action.
- Band limits need backend guards, same style as `CheckSession` standing checks.

### Code map

| Piece | Where |
|---|---|
| Formula, bands, action matrix | `backend/lib/Merit.js` |
| Writer + guards | `backend/services/MeritServices.js` |
| Facts SQL | `backend/repositories/MeritRepositories.js` |
| Frozen forum writes | `backend/lib/AccountRestriction.js` |
| Default 50 migration | `backend/migrations/1826100000000_merit-default-fifty.js` |
| Profile ring | `frontend/src/pages/user/7_profile/Displays/MeritSection_ProfileDisplay.tsx` |

`assertMeritAllows(accountId, action)` is the product gate. `scheduleMeritRecompute(ids)` is the fire-and-forget writer after an event.
