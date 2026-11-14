# Contracts, Milestones, Escrow, and Delivery Dashboard

Routes: `/contracts`, `/dashboard`, `/dashboard/tasks`, `/dashboard/review`, `/dashboard/rate`, `/dashboard/archived`, `/dashboard/flow`

Every hired job proposal and confirmed gig order creates a formal contract backed by platform escrow and milestone tracking.

## Contract types and statuses

- **Job Contracts:** Created from an approved individual or team proposal on a job post. Team milestone jobs can assign specific milestones to different team specialists.
- **Gig Contracts:** Created from an accepted and funded packaged service order.

Contract statuses move through:

- **Waiting:** Contract drafted, awaiting mutual signature or escrow deposit.
- **Active:** Escrow funded; milestones are unlocked sequentially as work progresses.
- **Done:** All milestones approved and paid out; a 24-hour double-blind **To Rate** window opens for both parties.
- **Closed:** Mutual ratings completed (or the 24-hour rating window ended) and the contract is archived.
- **Cancelled:** Terminated early with unreleased escrow credits refunded to the client.
- **Dispute Filed:** Escrow is held safely while support reviews a contract dispute.

## Milestone lifecycle and auto-approval rules

Milestones move through **Locked** (waiting on an earlier phase), **In Progress** (active phase), **Under Review** (deliverable submitted), **Revision Request** (changes requested per contract terms), and **Approved** (escrow payout released to the freelancer's wallet).

- **Client review window:** Clients have **5 calendar days** on Job Contracts and **3 calendar days** on Gig Contracts to review a submitted milestone. If no approval, revision request, or dispute is filed within that window, the milestone auto-approves and releases escrow credits to the freelancer.
- **Overdue milestones:** If a freelancer misses a milestone deadline without submitting, the milestone becomes Overdue; the client can grant an extension or cancel that milestone for a 100% refund of its escrow credits.

## Mutual cancellation

Either party can request a **Mutual Cancellation** on an active contract. The other party has **72 hours** to accept or decline. If unanswered after 72 hours, the cancellation auto-approves: unapproved or unfinished milestone funds in escrow return to the client's wallet, while already-approved milestone payouts stay with the freelancer. If declined, either party may open a dispute on `/contracts/dispute-form`.

## Delivery dashboard and ratings

Use `/dashboard` (and its `/dashboard/tasks`, `/dashboard/review`, `/dashboard/rate`, and `/dashboard/archived` tabs) to submit deliverables, review submissions, leave double-blind star ratings within 24 hours of contract completion, and view archived work.

If your account becomes Restricted or Frozen due to Platform Merit, you can still finish and deliver active contracts. If a counterparty is suspended or banned mid-contract, open a ticket or dispute on `/contracts/dispute-form` so support can resolve escrow fairly. Check the Current Ensemble Platform Settings document for current contract and cancellation fee rules.
