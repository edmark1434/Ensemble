# Ensemble Platform Merit

This is the **user-facing** reliability score. Users see **Platform Merit**. Staff and the engine use **warning points**.

Stars stay separate. Stars answer “was the work good?” Merit answers “can we trust this account?” Backend warning points are the only stored input ([warning-system.md](warning-system.md)).

Merit is **not a database column**. Every user starts at **100**. Active, unexpired warnings subtract from that number.

---

## Formula

```
Platform Merit = clamp(100 − active warning points, 0, 100)
```

Active warning points are the same sum the backend already uses: unrescinded `violations` rows whose `expires_at` is still in the future (or has no expiry yet). Expired, rescinded, pardoned, and deleted rows do not deduct merit.

When a warning expires or is rescinded, merit comes back by itself. Admin and Support can also **lift points** (a number of points, or up to a target merit) without deleting the warnings; the Record shows how much was lifted. Completions, review stars, verification, credits, and subscriptions never change merit. Not reviewing the other party within 24 hours of a contract ending does: the system issues the `missed_review` warning ([warning-system.md](warning-system.md) §4a).

**Merit triggers punishments; punishments do not follow merit.** When a warning takes merit down to a threshold level, that level's punishment starts and runs a fixed number of days (seeded: 60 Limited 1d, 55 Mute 1d, 50 Mute 2d, 45 Restricted 2d, 40 Frozen access 3d, 30 suspend 3d, 20 suspend 7d; nothing automatic above 60). It runs its full time even if merit recovers, and it never changes merit. Lower levels carry harsher punishments, so they add up as merit keeps dropping. See [warning-system.md](warning-system.md) §8.

---

## What users see

| Surface | What shows |
|---|---|
| Profile sidebar (always visible) | Platform Merit ring, 0–100. Default 100. |
| Profile Performance tab | Same ring with Record / dispute actions. |
| Owner Record | Current merit, named warnings, standing. Warnings show as merit taken (`−5 merit`), not “warning points.” |
| Public chips | Banned / Suspended / Locked / Timeout / Under dispute. Not the merit band name, not warning text. |
| Staff desks | Warning points, catalog, thresholds. Not this display name. |

Display tiers (from remaining merit), cut at the seeded punishment levels. They describe the number only and never name a punishment, because punishments run on their own clocks:

| Merit | Label | Seeded levels inside it |
|---|---|---|
| **100** | Trusted | — |
| **80–99** | Good | none |
| **61–79** | Fair | none |
| **41–60** | Low | Limited (60), Mute (55, 50), Restricted (45) |
| **40 and below** | Very low | Frozen access (40), suspensions (30, 20) |

What is actually paused comes from the running automatic punishments. The owner sees them under their merit ring and on the Record ("Running now: Mute until …", or "No limits running"); staff see them next to merit on every desk. Visitors see the tier only.

---

## What this is not

- Not stored on `accounts`.
- Not earned by finishing jobs, gigs, or reviews.
- Not for sale with credits, Premium, or Business.
- Not a star rating.
- Teams have no merit of their own. The acting user’s merit is what the backend checks. Staff desks show **team merit**: the active members' merit added up as a percentage of 100 each (`lib/TeamMerit.js`, `memberMeritSummary`). Five members at 100 → 100%; one of them at 50 → 450 / 500 = 90%. It is rounded down, so 100% means every member is at 100.

---

## Files

- Display helper: `frontend/src/lib/merit.ts`
- Derived on standing: `getPublicAccountStanding` / `getOwnAccountRecord` in `backend/lib/AccountRestriction.js`
- Source points: `sumActiveWarningPoints` in `backend/repositories/WarningBandRepositories.js`
- Punishments merit triggers: `backend/services/MeritPenaltyServices.js` (`merit_penalties`)
- Engine and staff contract: [warning-system.md](warning-system.md)
