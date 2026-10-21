# Current Task: Generic Wallet Transfer & Contract Subcontract Team Payouts

## Objective
1. **Generic Wallet Transfer (Account Settings → Wallet)**:
   - Add a "Transfer Credits" button right beside "Cash out" in `UserSettingsWallet`.
   - Provide an interactive modal to search platform users by handle/name, specify amount, add an optional note, review balance impact, and execute an instant wallet-to-wallet transfer.
   - Backend endpoint with row-level locks (`FOR UPDATE`), atomic debit/credit, `credit_transactions` audit logging, and realtime notifications.

2. **Contract Subcontracts & Team Fund Distribution (Contract Details Page)**:
   - Add database tables: `contract_subcontractors` and `contract_subcontract_distributions` via a clean new migration.
   - Enable freelancers to add/remove video editors under their active/completed contracts with assigned roles and agreed credits.
   - Enable freelancers to allocate and distribute contract funds to their team members upon milestone or contract completion.
   - Backend verification to ensure payouts do not exceed released contract earnings or available balance, executed with atomic DB transactions and realtime notifications.
   - Frontend UI in `ContractDetailsPage.tsx` with Team Roster, "Add Video Editor" modal, "Distribute Funds" modal, and payout history log.

## Acceptance Criteria
- [x] New migration created and applied cleanly (`up` and `down` defined).
- [x] Backend routes, controllers, services, and repositories implemented with strict separation of concerns.
- [x] Generic wallet transfer working with balance validation and audit trail.
- [x] Contract team management (add/remove editor) and fund distribution working.
- [x] Realtime socket notifications and balance updates dispatched.
- [x] Frontend builds cleanly with zero TypeScript errors (`cd frontend && npm run build`).
