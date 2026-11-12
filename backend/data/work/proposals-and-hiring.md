# Job Proposals and Hiring

Routes: `/jobs/proposals`, `/jobs/proposals/sent`, `/jobs/proposals/team-sent`, `/jobs/proposals/flow`, `/jobs/my-job-post`

When a client publishes a job on `/jobs/postings`, freelancers and teams submit proposals, and clients shortlist, approve, and extend contract offers.

## Submitting a proposal (Freelancers and Teams)

- **Create a proposal:** Open a job post on `/jobs/postings` and start a proposal. You provide your pitch, proposed pricing, service terms (using your default or custom terms from `/terms-of-services`), milestone schedule, and optional work samples before reviewing and submitting.
- **Track sent proposals:** View individual sent pitches on `/jobs/proposals/sent` and team proposals on `/jobs/proposals/team-sent`. You can edit or withdraw a pending proposal before the client makes a final decision.
- **Limits and submission fees:** Check the Current Ensemble Platform Settings document for any current fees. Accounts in the Restricted Platform Merit band (85 to 92) are capped at 3 proposals per UTC day; Frozen, Suspended, Locked, or Banned accounts cannot submit new proposals.
- **Refund guarantee:** If a job post closes or its application window expires without hiring anyone, proposal submission fees are automatically refunded to applicants' wallets.

## Reviewing proposals and hiring (Clients)

- **Incoming proposals:** Clients open `/jobs/my-job-post` or `/jobs/proposals` to review incoming proposals for each job post.
- **Proposal statuses:**
  - **Pending:** Newly submitted proposal awaiting client review.
  - **Shortlisted:** Marked as a top candidate for chat or video call interviews in `/inbox`.
  - **Offer Sent:** Client approved the proposal and extended a formal contract offer with escrow terms.
  - **Hired:** Contract offer signed and escrow funded; work moves to `/contracts` and `/dashboard`.
  - **Closed:** Job post closed or expired without hire.
  - **Rejected / Withdrawn:** Declined by the client or withdrawn by the applicant.

For an in-app visual walkthrough of job and proposal states, open `/jobs/proposals/flow`.
