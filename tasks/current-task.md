# Current Task

## Objective

Every Marketplace and Jobs & Gigs ticket about a specific item lets the member pick that item (asset, listing, job, gig, contract or gig order), and staff see the picked item on the case. Staff dispute details show a gig order's package and add-ons beside its milestones. See docs/api.md "Support tickets".

## Acceptance Criteria

- **Pickers on every item type.** Listing review, purchase, file, refund and contract types keep their own-record pickers. Report a listing or seller and Report a listing or user ask what is being reported, then search any visible asset or job/gig (`GET /api/users/ticket-search`), leaving out the member's own. Asset reviews searches the asset; Gig reviews picks the contract; the marketplace and jobs appeal types may name a listing, job or gig. The member can still type a name or paste a link when the item is not found.
- **Server checks.** A picked id must be an item the member can see or own (400 otherwise); a report cannot name the member's own item (400). Typed links that name a visible item are matched to it.
- **Team-owned items.** Listing, contract and job pickers include items held by teams the member owns, labelled so two similar items can be told apart (other party, status, team). Staff case context treats those teams as the requester.
- **Staff case context.** Marketplace and jobs cases read the new keys and older ones, show the reported seller or user, the picked posting (including a pasted job/gig link on a contract field) and the appeal's picked item. Related tickets match a listing by listing id or asset id.
- **Dispute add-ons.** Dispute case file contracts and the ticket case contract carry `gigOrder` (package, add-ons with price and extra days, totals); the staff panels show it and flag when package + add-ons differ from the contract rate.
