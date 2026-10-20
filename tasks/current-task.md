# Current Task: Show disputed contracts

## Objective
Mark a contract that has an open dispute, and give a button that opens that dispute.

## Acceptance Criteria
- [x] My Contracts shows an Active disputes button when the signed-in account can see an open dispute.
- [x] A disputed contract card uses a rose border, an Under dispute label, and a View dispute button.
- [x] Contract details show the same state and replace Report a Dispute with View active dispute.
- [x] The other party does not see a filing until staff open it.
- [ ] The contract badge needs the `disputes.contract_id` migration. Run `npm run migrate` in `backend` when the database is reachable.
- [ ] Do not git commit unless asked.
