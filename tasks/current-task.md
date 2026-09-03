# Current Task — Remove dispute outcome

Drop `disputes.outcome` from the database and remove outcome from moderator/admin dispute UI. Closed state is represented by `status = closed` only; optional sanctions remain on closed disputes.

## Acceptance Criteria

- [x] Migration drops `disputes.outcome` and its index (with `down` restore).
- [x] Backend seed/repos/enums no longer read or write `outcome`.
- [x] Dispute desk and detail modal no longer show or filter by outcome.
- [x] Migration applied locally (`149-drop-dispute-outcome`).

## Verification

- Apply `1811000000000_149-drop-dispute-outcome`.
- Confirm dispute list/detail load without outcome fields.
- Confirm closing a dispute and optional sanctions still work via status + sanction fields.
