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

When a warning expires or is rescinded, merit comes back by itself. Completions, reviews, verification, credits, and subscriptions never change merit.

---

## What users see

| Surface | What shows |
|---|---|
| Profile Performance tab | Platform Merit ring, 0–100. Default 100. |
| Owner Record | Current merit, named warnings, standing. Warnings show as merit taken (`−5 merit`), not “warning points.” |
| Public chips | Banned / Suspended / Locked / Timeout / Under dispute. Not the merit band name, not warning text. |
| Staff desks | Warning points, catalog, thresholds. Not this display name. |

Display bands (from remaining merit):

| Merit | Label |
|---|---|
| **100** | Trusted |
| **98–99** | Record |
| **93–97** | Limited |
| **85–92** | Restricted |
| **84 and below** | Frozen |

Product locks still follow backend warning-point thresholds. The ring is the user-facing number for those same points.

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
- Engine and staff contract: [warning-system.md](warning-system.md)
