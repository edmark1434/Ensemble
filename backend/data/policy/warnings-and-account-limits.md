# Warnings and Account Limits

Routes: `/profile`, `/account/appeal`, `/support/ticket`

Warnings are issued when an account breaks Ensemble's platform rules. Warnings are always temporary and deduct a fixed amount of Platform Merit until they expire or are lifted.

## How warnings work

Each warning comes from Ensemble's standard warning library and carries a set merit deduction (currently between 1 and 10 merit) and a set duration (currently from 3 to 90 days by default, or up to 365 days for custom categories). There are no permanent warnings.

Multiple active warnings stack together. For example, two active warnings that each take 5 merit reduce your Platform Merit by 10 total (to 90) until the first warning expires. When a warning expires, its deduction stops automatically and your account limits are recalculated from whatever active warnings remain.

## Common warning categories

Ensemble groups warnings across key platform areas. Typical defaults include:

- **Conduct and Safety:** Offensive language (2 merit, 5 days), inappropriate content (3 merit, 7 days), harassment or bullying (5 merit, 14 days), hate speech or sharing private information (8 merit, 45 days), and threats or violence (10 merit, 90 days, which also triggers a suspension or ban review).
- **Forums and Messaging:** Off-topic flooding (1 merit, 3 days), unsolicited spam messages (2 merit, 5 days), repeated forum spam (3 merit, 7 days), copyrighted material or chat harassment (5 merit, 14 days), and chat scams or phishing (8 merit, 45 days).
- **Jobs and Gigs:** Duplicate or spam posts (3 merit, 7 days), misleading job or gig details or no-shows after hire (5 merit, 14 days), job fee evasion or review manipulation (6 merit, 21 days), and fake offers, stolen gig media, or fake deliveries (8 merit, 45 days).
- **Asset Marketplace:** Spam listings (3 merit, 7 days), misleading listings (5 merit, 14 days), marketplace fee evasion (6 merit, 21 days), copyright infringement (7 merit, 30 days), stolen or unauthorized assets (8 merit, 45 days), and malware or harmful files (10 merit, 90 days, with listing removal).
- **Identity, Teams, Money, and Editor:** Inappropriate profile content (3 merit, 7 days), fake teams, team harassment, dispute abuse, or editor harassment (5 merit, 14 days), impersonation or refund/chargeback abuse (8 merit, 45 days), and fraudulent identity documents, payment fraud, or harmful editor files (10 merit, 90 days).

## Automatic limits by Platform Merit

While warnings are active, automatic limits apply based on your remaining Platform Merit (these default bands may be updated by Ensemble):

- **98 to 99 Merit (Record):** Full site access remains enabled; the warning appears on your private Account Record.
- **93 to 97 Merit (Limited):** You can still browse, post normal jobs, create gigs, send proposals, post in forums, and cash out. You cannot post urgent jobs, and new marketplace asset listings go through review before publishing.
- **85 to 92 Merit (Restricted):** You can browse, read forums, message existing job/gig/contract threads, start new DMs, buy credits, cash out, and finish active contracts. You cannot post new jobs or gigs, publish new asset listings, comment on assets, write in forums, create or join new teams, or start new shared editor projects. Proposals are capped at 3 per UTC day.
- **84 Merit or below (Frozen):** In addition to Restricted limits, new proposals, new direct messages, new inbox groups, and cashouts are paused (your wallet balance is never seized). You can still buy credits, manage subscriptions, use personal editor projects, and finish live contracts or file tickets, appeals, or disputes on existing work.

## Automatic temporary suspensions

If stacked active warnings drop your Platform Merit to 80 or below (20 or more active warning points), Ensemble automatically applies a 7-day temporary suspension. At 70 or below (30 or more active warning points), the automatic suspension is 14 days. Once that cooldown ends, your account moves back to the automatic band matching your remaining active warnings until they expire.

## Protection for active work

Warnings and automatic merit limits never cancel an open contract, gig order, or existing team membership, and they never seize wallet funds. You can continue delivering and completing work already in progress under Frozen or Restricted access unless a manual suspension, lock, or ban applies.
