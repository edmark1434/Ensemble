# Tickets, Purchases, and Reports

Customer support route: `/landing/SubmitATicket`

Sources:

- `frontend/src/pages/landing/pages/page_SubmitATicket.tsx`
- `frontend/src/pages/admin/ticketManagement/ticketTypes.ts`
- `frontend/src/pages/user/5_assets/AssetDetails.tsx`
- `frontend/src/pages/admin/moderation/moderationTypes.ts`

## Ticket categories

The ticket catalog groups requests into:

- Support: account access, verification, profile/settings, subscriptions, top-ups, withdrawals, billing, video editor, notifications, technical issues, and other concerns
- Forums: forums, posts, groups, comments, and forum reports
- Marketplace: assets, listings, purchase/delivery, seller verification, refunds, and asset quality
- Jobs and gigs: job posts, gig posts, applications/hiring, contracts, and milestones

## Ticket lifecycle

Tickets can be Open, In Progress, Resolved, or Closed, with Low, Medium, or High priority. They may be assigned, escalated to a specialist queue, marked as waiting for a response, and linked to a report or dispute. Ticket messages distinguish staff-internal communication from messages visible to the requester or involved parties.

## Asset purchase flow

An authenticated non-owner can purchase a published asset when the wallet has sufficient credits. The backend is authoritative for price, balance, fee, entitlement, and duplicate-purchase prevention. A successful purchase grants access without transferring creator ownership.

## Purchase problems

Use the Marketplace ticket types for listing, purchase/delivery, refund, or asset-quality concerns. Documentation chat cannot grant an entitlement, reverse a purchase, issue a refund, or change a wallet.

## Reports

A user report identifies a reporter, target type and identifier, reason, description, priority, status, assignee, and timestamps. Reports are reviewed by the appropriate staff queue. Filing a report does not itself prove a violation.

## Disputes

Disputes can relate to platform entities and credits. Staff permissions determine who may view, reply, assign, act, release held credits, or resolve a dispute. The assistant must not predict or guarantee an outcome.
