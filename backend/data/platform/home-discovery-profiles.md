# Home, Discovery, Profiles, and Notifications

Routes: `/home`, `/discovery`, `/profile`, `/notifications`

## Home feed

Route: `/home`

The Home feed welcomes signed-in users and guests with quick navigation across Ensemble and featured marketplace assets with category filters and search so you can jump straight into work, assets, or projects.

## Discovery hub

Route: `/discovery`

Discovery helps clients, collaborators, and creators find each other across several tabs:

- **Discover Creators (`/discovery/creators`):** Browse freelancer and creator profiles ranked by profile quality, ratings, verification, subscription visibility boost, and activity.
- **Discover Teams (`/discovery/teams`):** Explore public creative teams and studio profiles.
- **Matched Editors (`/discovery/matched`):** For signed-in clients with open jobs, matches freelancers whose skills align with your job requirements.
- **General Gallery (`/discovery/gallery`):** Browse portfolio showcase items uploaded by creators.
- **My Standing (`/discovery/standout`):** View how your own profile ranks and tips to improve your visibility (signed-in users).
- **How Discovery Works (`/discovery/info`):** In-app guide explaining discovery ranking factors.

You can also search directly for users by handle or name using the search bar.

## Public profiles

Route: `/profile` (or a specific user's profile page)

A user profile displays:

- Name, handle, avatar, banner, tagline, bio, introduction, skills, and social links
- Portfolio showcase gallery, published services, job posts, assets, projects, and buyer/client reviews
- **Platform Merit ring** (0 to 100 reliability score) and **Total / Freelance Star Ratings**
- Up to **5 pinned badges** (hidden if the account is Banned, Locked, or in the Frozen merit band)
- Public standing chips only when applicable (Banned, Suspended, Locked, or Timeout) - private warning details are never shown publicly.

## Notifications

Route: `/notifications`

Your Notifications page delivers real-time updates for:

- Proposal updates, contract offers, milestone submissions, approvals, and overdue alerts
- Gig order acceptances and status changes
- Personal and team verification outcomes
- Pending **Badge Grants** (with a one-click **Claim** button)
- Account warnings, timeouts, or standing changes
