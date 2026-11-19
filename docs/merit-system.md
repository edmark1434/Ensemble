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

When a warning expires or is rescinded, merit comes back by itself. Admin and Support can also **lift points** (a number of points, or up to a target merit) without deleting the warnings; the Record shows how much was lifted. Completions, reviews, verification, credits, and subscriptions never change merit.

**Merit triggers punishments; punishments do not follow merit.** When a warning takes merit down to a threshold level, that level's punishment starts and runs a fixed number of days (seeded: 95 Limited 1d, 90 Mute 1d, 85 Mute 2d, 80 Restricted 2d, 75 Frozen access 3d, 70 suspend 3d, 60 suspend 7d). It runs its full time even if merit recovers, and it never changes merit. Lower levels carry harsher punishments, so they add up as merit keeps dropping. See [warning-system.md](warning-system.md) §8.

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
| **96–99** | Good | none |
| **86–95** | Fair | Limited (95), Mute (90) |
| **76–85** | Low | Mute (85), Restricted (80) |
| **75 and below** | Very low | Frozen access (75), suspensions (70, 60) |

What is actually paused comes from the running automatic punishments. The owner sees them under their merit ring and on the Record ("Running now: Mute until …", or "No limits running"); staff see them next to merit on every desk. Visitors see the tier only.

---

## What this is not

- Not stored on `accounts`.
- Not earned by finishing jobs, gigs, or reviews.
- Not for sale with credits, Premium, or Business.
- Not a star rating.
- Teams have no merit ring. The acting user’s merit is what the backend checks.

---

## Files

- Display helper: `frontend/src/lib/merit.ts`
- Derived on standing: `getPublicAccountStanding` / `getOwnAccountRecord` in `backend/lib/AccountRestriction.js`
- Source points: `sumActiveWarningPoints` in `backend/repositories/WarningBandRepositories.js`
- Punishments merit triggers: `backend/services/MeritPenaltyServices.js` (`merit_penalties`)
- Engine and staff contract: [warning-system.md](warning-system.md)
