# Jobs, Proposals, Gigs, and Contracts

Route source: `frontend/src/App.tsx`

## Jobs

- Browse job posts: `/jobs/postings`
- Saved posts: `/jobs/saved-posts`
- Manage authored posts: `/jobs/my-job-post`
- Create: `/jobs/create`
- Edit: `/jobs/edit/:id`

## Proposals

- Start/select proposal work: `/jobs/proposals`
- Make a proposal: `/jobs/:id/make-proposal`
- View sent proposals: `/jobs/proposals/sent`
- Edit a proposal: `/jobs/proposals/edit/:proposalId`
- Review a received proposal: `/jobs/proposals/received/:proposalId`
- Review a sent proposal: `/jobs/proposals/sent/:proposalId`

The proposal creation interface collects a pitch and price, service terms, milestones, and a final review before submission.

## Gigs

- Browse services: `/gigs/services`
- Saved services: `/gigs/saved-services`
- Manage authored services: `/gigs/my-services`
- Create: `/gigs/create`
- Full service page: `/gigs/services/:id/page`

Gig creation collects core service information, delivery and service terms, pricing tiers, media, client requirement questions, and a final review.

## Contracts

- Contract list: `/contracts`
- Contract detail: `/contracts/:id`

Contract-related screens present agreed terms, milestones, fees, and participant actions according to the contract's current state. The assistant must not state that a proposal, offer, acceptance, milestone, or payment occurred without account-specific backend confirmation.
