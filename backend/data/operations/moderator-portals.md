# Specialist Moderator Portals

Role-protected portal roots:

- Forum moderation: `/moderator/forum`
- Marketplace moderation: `/moderator/marketplace`
- Support moderation: `/moderator/support`
- Jobs and gigs moderation: `/moderator/jobs`

Source: `frontend/src/App.tsx` and `frontend/src/pages/moderator/`

## Shared portal capabilities

Each specialist portal has a dashboard and scoped operational queues. Depending on the role, the portal provides ticket management, reports, disputes, user/team context, and domain-specific controls. Staff middleware and backend role checks protect these routes.

## Forum moderators

Forum queues cover groups, discussions, posts, comments, forum tickets, reports, disputes, and related user context.

## Marketplace moderators

Marketplace queues cover listings, sellers, assets, purchases, asset quality, refunds, tickets, reports, disputes, and listing-control actions.

## Support moderators

Support queues cover account access, verification, profiles/settings, subscriptions, top-ups, withdrawals, billing, technical issues, notifications, tickets, reports, and disputes.

## Jobs and gigs moderators

Jobs/gigs queues cover job posts, gigs, proposals, applications, hiring, contracts, milestones, tickets, reports, disputes, and marketplace-control actions for that domain.

## Escalation

Tickets may be escalated to Support Moderator, Marketplace Moderator, Forum Moderator, Jobs and Gigs Moderator, or Admin according to the issue type. Escalation changes operational ownership; it does not guarantee a specific resolution.
