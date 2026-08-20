# How to Work and Earn on Ensemble

Route: `/landing/HowToWork`

Source: `frontend/src/pages/landing/pages/page_HowToWork.tsx`

## Sell a gig service

1. Create a gig with service details, pricing tiers, delivery times, and work examples.
2. Receive client requests or messages.
3. Discuss creative direction, schedule, and scope.
4. Review the offered milestone-backed contract.
5. Accept the service and platform terms before starting work.

Routes: `/gigs/create`, `/gigs/my-services`, `/inbox/*`, `/contracts`

## Apply to jobs

1. Browse open job posts.
2. Send a proposal with experience, bid, terms, and milestones.
3. Discuss the work after being shortlisted.
4. Review the resulting contract offer.
5. Accept the applicable terms before starting tracked work.

Routes: `/jobs/postings`, `/jobs/:id/make-proposal`, `/jobs/proposals/sent`, `/contracts`

## Sell marketplace assets

1. Open the Assets Library and create an asset listing.
2. Upload the original media and listing thumbnail, then provide listing details, price, and tags.
3. Publish the asset when it meets the applicable listing workflow.
4. Purchases grant buyers access to the protected original while the creator remains the owner of the listing.
5. Sale proceeds are reflected through the platform credit and transaction system.

Routes: `/assets`, `/assets/:assetId`, `/transactions`

The public page mentions approval by a curation board. The active asset UI and backend configuration determine whether review is currently required; do not promise a review time from this page.
