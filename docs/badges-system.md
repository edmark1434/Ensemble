# Ensemble Badge System

This is the operating contract for milestones. One catalog, granted from real products: signup/alpha, profile setup, jobs, gigs, and the asset marketplace. Users claim from notifications, pin up to five on `/profile`, and staff revoke only for fraud or a mistaken grant.

Badges never change Platform Merit. Merit never deletes badges.

Badges answer “what have they earned?” Stars answer “was the work good?” Merit answers “can we trust this account?” ([merit-system.md](merit-system.md)). Warnings are the backend input to merit ([warning-system.md](warning-system.md)). Punishment answers “what is locked right now?” ([punishment-system.md](punishment-system.md)).

---

## Contents

1. How badges connect to the other systems
2. Who this applies to
3. Starting state
4. Grant, claim, pin, revoke
5. Catalog
6. Visibility
7. Per-product triggers
8. Staff
9. Flows and examples
10. Anti-abuse and implementation

---

## 1. How badges connect to the other systems

```
eligible on a real product
        │
        ▼
 pending grant + notification
        │
        ▼
 user claims
        │
        ▼
 pin up to 5 on /profile
        │
        ▼
 admin revoke only for fraud / mistake
```

Warning bands and punishments never grant or delete badges. Frozen access / Banned / Locked **hide** claimed badges on the public profile. They are not removed from the account.

Publishing an asset grants a creator badge. Completing work grants freelance/client ranks. Neither changes Platform Merit.

---

## 2. Who this applies to

| Actor | Badges | Notes |
|---|---|---|
| Guest | No | Must sign up. |
| User account (enthusiast / freelancer / client — same account) | Yes | Tracks are per role-of-the-action, not separate accounts. The same person can hold freelancer, client, and creator ranks. |
| Team account | No | Acting user earns personal badges. Teams do not have a badge shelf. |
| Staff | Honorary only | Admin grant. Staff `performanceScore` is not this system. |

Subscriptions (Free / Premium / Business) never buy a badge.

---

## 3. Starting state

| Field | New user |
|---|---|
| Badges | Pending Alpha Tester while alpha is open |
| Claimed | None until they claim |
| Pins | None |

Platform Merit starts at 100 and standing starts Active — those are the other two systems.

---

## 4. Grant, claim, pin, revoke

Keep pending-until-claim.

1. **Eligible.** A product event matches a catalog row (signup during alpha, profile 100%, N successful closes, N published assets) or an admin grant.
2. **Pending grant.** Write the pending badge and notify (`/notifications` and the existing badge socket). Do not auto-claim.
3. **Claim.** User claims from `/notifications`. Allowed unless Suspended / Ban / Lock (those standing locks block writes). Frozen may claim; public profile still hides badges until they leave Frozen.
4. **Pin.** Owner curates up to **5** on `/profile`. Ranks stack; pinning is curation, not a new grant.
5. **Revoke.** Admin only, and only for fraud or a mistaken grant. Frozen access, Ban, and Lock never delete rows.

Joed profile intro and identity verification do not grant badges.

---

## 5. Catalog

| ID | Name | Product trigger | Count |
|---|---|---|---|
| `acc-alpha` | Alpha Tester | signup during alpha | already |
| `acc-beta` | Beta Tester | admin or beta flag | — |
| `setup-profile` | Profile Complete | profile checklist 100% | already |
| `acc-freelance-1..4` | Fresh → Grand Freelancer | successful **job or gig** close as freelancer | 1 / 10 / 50 / 100 |
| `acc-client-1..4` | Fresh → Grand Client | successful funded close as client | 1 / 10 / 50 / 100 |
| `acc-asset-1..4` | Fresh → Grand Creator | marketplace asset **published** (after review if queued) | 1 / 10 / 50 / 100 |

Ranks stack. Fresh at 1, then 10, 50, 100.

Successful close means the contract or gig order actually completed, not cancelled, not expired-without-hire, not refunded-without-delivery.

No forum, chat, or editor badges in v1.

Do not run `SeedBadgesOneOff.js` (wrong registry IDs). Alpha/Beta banners already require the claimed badge.

---

## 6. Visibility

**Public** (`/profile/:id`, job/gig/asset author chips): up to 5 pinned badges. **Hidden** while Banned, Locked, or Frozen access. Standing chips are the punishment system.

**Owner:** sees pending grants, claimed badges, and pins even while Frozen access. Record modal is standing/warnings, not the badge shelf.

**Never public:** pending-unclaimed badges, revoked rows, admin grant notes.

**Counterparties** on a job/gig/contract see the same public pins, hidden under Ban/Lock/Frozen.

---

## 7. Per-product triggers

### 7.1 Account, profile, signup

**Routes:** `/signup`, `/profile`, `/profile/:id`

- Signup during alpha → pending `acc-alpha`.
- Profile checklist 100% → pending `setup-profile`.
- Beta: admin or beta flag → pending `acc-beta`.

### 7.2 Jobs, gigs, contracts, dashboard

**Routes:** `/jobs/*`, `/gigs/*`, `/contracts`, `/dashboard`

- Successful job or gig close as freelancer → evaluate `acc-freelance-1..4`.
- Successful funded close as client → evaluate `acc-client-1..4`.
- Badge evaluate freelance/client tracks on the same close.
- Cancelled / expired-without-hire / refund-without-delivery: **no** badge progress.

### 7.3 Asset marketplace

**Routes:** `/assets`, asset editor

- Count **published** assets (after review if queued) toward `acc-asset-1..4`.
- Limited-band listing review still counts once the listing is actually published, not while it sits pending.

### 7.4 Forums, inbox, editor, teams

No badge grants in v1. Team work still grants the **acting user’s** freelance/client badges when the related job or gig closes.

### 7.5 Notifications

**Route:** `/notifications`

- Badge grant notifies here.
- Claim: allowed unless Suspended/Ban/Lock. Frozen may claim; public profile still hides until they leave Frozen.

---

## 8. Staff

| Desk | Route | Can do |
|---|---|---|
| Admin | `/admin/badges` | catalog CRUD, grant (including honorary / beta), revoke for fraud or mistake |
| Other desks | — | no grant, no revoke |

Product catalog IDs (`acc-alpha`, ranks, `setup-profile`) can be renamed but not deleted or re-id'd. Honorary badges can be created, edited, and soft-deleted. Soft-delete hides the definition; grants stay until staff revoke them. `/admin/badge-grant` redirects to the Grant tab.

Each badge stores one unlock on the `badges` row: `trigger_event_code` (the metric), `condition_type` (`boolean` or `count`), and `condition_value` (the number). `admin_grant` means honorary. Category is a text field on the same row. Product unlocks cannot be changed.

The 15 product badges ship with those columns already set: alpha signup, beta flag, profile checklist, freelancer/client/creator ranks at 1 / 10 / 50 / 100. Staff can add honorary badges or a custom single-metric badge (for example “at least 25 followers”).

Forums, chat, editor, identity verification, and paid plans are not unlock sources.

Restrictions views do not need a badge editor. Show claimed badges on the user record so staff can spot a mistaken grant.

---

## 9. Flows and examples

### New user across products

```
signup → pending Alpha Tester
profile 100% → pending Profile Complete
first gig close as freelancer → pending Fresh Freelancer
first job hired as client → pending Fresh Client
first published asset → pending Fresh Creator
```

Platform Merit on that same path is independent ([merit-system.md](merit-system.md)).

### Frozen access then they finish work

```
Platform Merit 84 or below (Frozen access), badges already claimed
they deliver a live gig
  → Fresh/next freelancer rank may pending-grant
  → they may claim from notifications
  → public profile still hides pins until Platform Merit recovers above 84
```

### Dispute conviction

```
convict → permanent ban
badges remain on the account, hidden on the public profile
appeal restore does not re-grant anything; pins come back when standing allows public display
```

---

## 10. Anti-abuse and implementation

- Users cannot grant themselves a badge except by claiming an already-pending grant.
- Completions that advance freelance/client ranks = successful close only.
- Publishing that advances creator ranks = actually published, not draft, not rejected review.
- Admin revoke is the only delete path. Frozen/Ban/Lock hide, they do not delete.
- Do not run `SeedBadgesOneOff.js`.

Build order (badge slice):

1. Keep pending-until-claim. Fix registry IDs. Alpha/Beta banners already require the claimed badge.
2. Auto-award 1/10/50/100 on job/gig close and on publish. `evaluateAccountBadges` pending-grants any catalog row whose single unlock is met.
3. Hide pins on public profile while Frozen / Banned / Locked.

Do not describe this as live in `backend/data/` until it ships.
