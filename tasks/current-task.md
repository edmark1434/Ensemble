# Active Task: Category case files for staff ticket and dispute views

## Implementation Objective

In every staff/admin ticket desk, show the records each ticket category is about, so staff do not have to
look them up elsewhere. Add the missing standing context to the dispute desk.

## Acceptance criteria

- Ticket detail has a Case tab whose layout depends on the ticket category:
  - Appeals: requester standing, what accepting lifts (and that warnings stay), active punishments with issuer,
    standing history with reasons and staff, area-specific actions (listings, postings, forum), past warnings,
    previous appeals with decisions, active denial hold, the member's reason/evidence, and the Case ID resolved
    to a real warning/dispute/report/ticket/listing (flagged if not on the requester's account).
  - Marketplace: listing (status, rejection/moderation note, reviewer, files and processing errors, reports,
    review history, copyright signals, seller standing), the requester's licenses for the asset, buyer stats or
    seller listings, reported seller, other tickets about the item.
  - Jobs & Gigs: contract (status, rate, requester role, both parties' standing, milestones, disputes on the
    contract, escrow transactions), posting (status, reports, moderation history), reported member, related tickets.
  - Forum: post (status, lock/pin, comments, reports), group, reported member, requester's forum restrictions.
  - Billing (Admin/Support only): wallet, plan, and the quoted transaction checked against the requester.
  - Account / editor / safety: verification status, team, recent sign-in changes; project; reported member or infringing listings.
- The appeal decision sidebar and confirm dialog show what is active now and what accepting lifts.
- Area appeals (forum/marketplace/jobs) explain how they are resolved.
- Dispute case file shows both parties' standing and support tickets about the same contract.
- Contract picker includes gig orders; job picker includes jobs the member applied to.
- Case data is staff-only, desk-scoped, read-only, and fault-isolated per section.

## Status: Implemented — awaiting user verification (`pnpm typecheck`).
