# How to Hire on Ensemble

Route: `/landing/HowToHire`

Source: `frontend/src/pages/landing/pages/page_HowToHire.tsx`

## Hire through gigs

1. Browse creative gigs and packaged services.
2. Send the creator a request with the project brief, requirements, and timeline.
3. Discuss the project and align goals, requirements, and milestones.
4. Offer a contract containing scope, milestone pricing, and delivery expectations.
5. Agree to the service and platform terms before work begins.

Relevant routes:

- Browse gigs: `/gigs/services`
- View a gig: `/gigs/services/:id/page`
- Inbox: `/inbox/*`
- Contracts: `/contracts`

## Hire through job posts

1. Publish a job post with budget, skills, and delivery goals.
2. Receive and review freelancer proposals.
3. Shortlist candidates and discuss deliverables.
4. Extend a contract offer with scope and payout conditions.
5. Agree to the service and platform terms.

Relevant routes:

- Job postings: `/jobs/postings`
- Create a job: `/jobs/create`
- My job posts: `/jobs/my-job-post`
- Incoming proposals: `/jobs/proposals/incoming/:jobPostId`
- Contracts: `/contracts`

Dynamic route placeholders require an actual job, gig, proposal, or contract identifier.
