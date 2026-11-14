# Gig Orders

Routes: `/gigs/orders`, `/gigs/orders/sent`, `/gigs/my-orders`, `/gigs/orders/flow`, `/gigs/services`

Gig Orders manage requests when a client buys a packaged service from `/gigs/services` before and as it becomes an escrow-backed contract.

## Ordering a service (Clients)

1. Browse `/gigs/services` or `/discovery` and open a service package.
2. Select a tier (**Basic**, **Standard**, or **Premium**) or custom milestone pitch, complete the creator's required intake questionnaire, and attach reference briefs or link a project.
3. Submit the order. Track your placed orders on `/gigs/orders/sent` or `/gigs/my-orders`.
4. Once the freelancer accepts your order, confirm and fund escrow within **24 hours** to launch the contract (accepted orders expire automatically if not confirmed in time).

## Managing incoming orders (Freelancers)

- Open `/gigs/orders` (and select a service) to view incoming orders in your queue.
- Inspect the buyer's brief, questionnaire answers, and timeline against your queue slot capacity before clicking **Accept** or **Reject**.
- Once the client funds escrow on an accepted order, the order transitions into an active contract on `/contracts` and `/dashboard`.

## Order statuses

- **Pending:** Waiting for the seller to review and accept or reject the order.
- **Accepted:** Seller accepted the scope and schedule; awaiting the client's escrow confirmation to start the contract.
- **In Contract:** Escrow is funded and milestone delivery is active.
- **Completed:** All milestones approved, payouts released, and order finished.
- **Rejected:** Seller declined the order (for example, out-of-scope request or full schedule).
- **Withdrawn:** Client cancelled the order before seller acceptance.

For an in-app summary of service orders, open `/gigs/orders/flow`.
