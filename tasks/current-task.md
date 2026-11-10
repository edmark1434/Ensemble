# Active Task: Profile dispute visibility

## Implementation Objective

Remove the public "Under dispute" header badge. Surface open and closed public disputes as profile tabs beside Performance (Active History / Dispute History).

## Acceptance Criteria

- [x] Profile header no longer shows the yellow Under dispute badge
- [x] Active History tab lists open public disputes beside Performance
- [x] Dispute History tab lists closed public disputes beside Performance
- [x] Performance panel no longer needs the footer dispute accordion
- [x] Frontend build passes

---

# Active Task: One dispute per contract + staff party swap

## Implementation Objective

When one side disputes a contract, the other side can't file a second dispute, and both sides can see that the contract is already disputed. Staff can swap the disputer and disputee when the case was filed by the wrong side.

## Acceptance Criteria

- [x] `active_dispute` reaches the disputee too (private case: no id/number leaked)
- [x] Contract card, contract page and actions menu show "already disputed" and hide Report a Dispute
- [x] Dispute form marks disputed contracts in the picker, shows a banner, and blocks submit (backend 409 still enforced)
- [x] `swap_parties` staff action swaps the parties in Postgres and flips the Mongo message audiences/roles atomically
- [x] Swap posts a "Parties swapped" notice card, notifies both parties, logs activity
- [x] Staff modal: Parties section labels client/freelancer and offers Swap with a confirm dialog
- [x] Frontend build passes
- [ ] Manual test against a non-production DB + Mongo: file dispute as client, check freelancer view, swap, check message visibility
