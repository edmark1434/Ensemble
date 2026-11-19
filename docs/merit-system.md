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

**Merit triggers punishments; punishments do not follow merit.** When a warning takes merit down to a threshold level, that level's punishment starts and runs a fixed number of days (seeded: 97 Limited 3d, 92 Restricted 5d, 90 Mute 3d, 85 Mute 5d, 84 Frozen access 7d, 80 suspend 7d, 70 suspend 14d). It runs its full time even if merit recovers, and it never changes merit. Lower levels carry harsher punishments, so they add up as merit keeps dropping. See [warning-system.md](warning-system.md) §8.

---

## What users see

| Surface | What shows |
|---|---|
| Profile sidebar (always visible) | Platform Merit ring, 0–100. Default 100. |
| Profile Performance tab | Same ring with Record / dispute actions. |
| Owner Record | Current merit, named warnings, standing. Warnings show as merit taken (`−5 merit`), not “warning points.” |
| Public chips | Banned / Suspended / Locked / Timeout / Under dispute. Not the merit band name, not warning text. |
| Staff desks | Warning points, catalog, thresholds. Not this display name. |

Display tiers (from remaining merit). They describe the number only and never name a punishment, because punishments run on their own clocks:

| Merit | Label |
|---|---|
| **100** | Trusted |
| **95–99** | Good |
| **85–94** | Fair |
| **70–84** | Low |
| **69 and below** | Very low |

What is actually paused comes from the running automatic punishments (status bar, Record), not from the ring.

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
