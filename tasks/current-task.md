# Active Task: Fix double-counted escrow on contract disputes

## Implementation Objective

Job contracts fund escrow in two hops that are both logged as `Escrow Hold`
(client account → client escrow on offer, client escrow → freelancer escrow on
accept). The dispute escrow math summed every hold, so DIS-787553 showed 1,500
credits involved on a 750-credit contract, and staff settlement allowed paying
out up to 1,500 from the freelancer's escrow wallet.

Count escrow by wallet movement instead: credits entering an escrow wallet from
a non-escrow wallet, minus credits leaving an escrow wallet to a non-escrow
wallet. Escrow-to-escrow hops net to zero.

## Acceptance Criteria

- [x] Opening a contract dispute stores the real remaining escrow in
      `disputes.credit_amount_involved` (750 for a 750-credit job contract).
- [x] Staff escrow settlement caps the payout at the same real remaining escrow.
- [x] Both use one shared calculation in `backend/lib/DisputeEscrow.js`.
- [x] Paid milestone revisions (`contract_milestone_revisions`) count toward the
      contract's escrow, and fees out of escrow count as leaving it.
- [x] A new migration recomputes `credit_amount_involved` for open contract
      disputes (DIS-787553 → 750); `down` restores the old figure.
- [ ] Migration applied to the database.
