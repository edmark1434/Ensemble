# Current Task — Team Marketplace Acting Accounts

Allow an authenticated user to post jobs and gigs, submit job proposals and gig orders, and manage resulting offers/contracts using either their personal account or a team account they are authorized to manage.

## Acceptance Criteria

- [x] The browser submits a team ID only; it never chooses or controls the persisted team account ID.
- [x] The backend resolves the team account and requires an active Owner/Admin membership.
- [x] Personal and selected team marketplace actors must be verified for create/submit actions.
- [x] Job and gig listings persist the acting account as their owner while personal behavior remains the default.
- [x] Job proposals and gig orders persist the acting account as the applicant/client.
- [x] Users can read and manage listings, proposals, orders, and contracts belonging to any authorized acting account.
- [x] Self-proposals/self-orders and duplicate active submissions are rejected on the backend.
- [x] Job offers use the actual client/team account wallet and escrow wallet.
- [x] Job-offer acceptance transfers from the actual client/team escrow wallet to the actual freelancer/team escrow wallet.
- [x] Gig-order acceptance transfers from the actual client/team account wallet to the actual freelancer/team escrow wallet.
- [x] Wallet changes and escrow ledger writes remain inside the existing database transactions.
- [x] Team-account notifications are visible to authorized Owners/Admins and delivered through team account Socket.IO rooms.
- [x] Job post, proposal, gig post, and gig order forms expose a shared marketplace identity selector.
- [x] No schema migration is required because existing marketplace owner columns already reference accounts and team accounts already own account/escrow wallets.
- [x] Backend syntax checks and the frontend production build pass.

Status: Completed August 30, 2026.

## Implementation Notes

Added a shared server-side marketplace actor resolver and an authenticated team actor listing endpoint. Team actions accept only a team ID, resolve its account server-side, and enforce active Owner/Admin membership, active account state, and verification. Repository ownership checks now accept the authenticated user's personal account plus authorized team accounts, while create/submit operations persist exactly one resolved acting account. Existing job and gig payment transactions now derive the actual client and freelancer accounts from locked proposal/order rows, so team account wallets and escrow wallets participate without a separate payment implementation. Notification reads and socket connections include authorized team account rooms. The frontend uses one shared identity selector in the four creation/submission flows.

## Verification

Executed Node syntax checks for the affected team, marketplace actor, job, gig, contract, notification, and WebSocket backend files. Executed `npm run build` in `frontend`; TypeScript and Vite production build passed. Vite reported only the existing large-chunk and mixed static/dynamic import warnings.
