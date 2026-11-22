# Current Task

## Objective

Marketplace submissions get a full review loop with a conversation per listing. A seller submits an asset, staff approve it (live now, in 24 hours, in 7 days, or on a chosen date) or send it back with a message, and the seller answers by resubmitting with a message. Every decision, resubmission and reply is kept in one thread both sides can read. See docs/api.md "Marketplace submission review".

## Acceptance Criteria

- **Thread.** Migration `1830400000000_marketplace-listing-review-thread` adds `marketplace_listing_messages` and `marketplace_listings.publish_at`, and seeds a thread entry from each rejected / delisted listing's stored reason.
- **Approve timing.** Staff approve with `publishMode` `now` | `24h` | `7d` | `date` (+ `publishAt`, 5 minutes to 365 days ahead). Anything but `now` stores status `scheduled` with `publish_at`; the asset stays out of the catalog. Staff can publish a scheduled listing now, move its time, or reject it.
- **Go-live job.** Every minute, due `scheduled` listings become `approved`, the asset is published, a system `published` entry is added and the seller is notified.
- **Reject / delist → resubmit.** Reject and delist require a message, which the seller sees in the thread. The seller resubmits from the asset page (message required) or by saving edits in the editor (message required while rejected or delisted). Resubmitting moves the listing back to `pending`.
- **Replies.** While a listing is `pending` or `scheduled`, staff and seller can post plain replies. Staff replies notify the seller; seller messages refresh the staff desks, and the queue marks listings whose latest entry is from the seller.
- **Seller views.** Asset cards show Scheduled and Delisted states; the owner's asset page shows the thread with the right composer. "Under review" includes scheduled, "Rejected" includes delisted.
- **Staff views.** Marketplace Control has a Scheduled tab and count; the listing modal shows the thread, a reply box and the go-live time; every action opens the decision dialog (approve has the timing choice).

# Parallel task: live staff consoles

## Objective

Every Admin and staff console page, tab, modal and case chat updates on its own when data changes anywhere (a member, another staff member, a background job, another tab), with no reload. See docs/api.md `staffDataChanged` and docs/frontend.md "Every console page…".

## Acceptance Criteria

- **One server signal.** Saved HTTP writes emit `staffDataChanged { topics }` to `staff:cases` (`middleware/StaffLiveUpdates.js`): staff writes send every topic, member writes map by path, failed writes and reads send nothing. Background jobs emit through `announceJobChange` only when they changed something. Payloads name areas only.
- **Every view subscribes.** Each console page, tab and modal that reads data re-reads through `useStaffLive` (or `useStaffCaseEvents`), including Admin dashboard, User & Team (all tabs and account modals), Credits & economy (overview, Wallets / Holds / Ledger, wallet and ledger modals, plans), Moderation (overview-fed queues, activity log and entry, forum desk, video projects, verification cases, report and listing cases), Policy catalogs and pickers, Badges, Feedback, System settings, Analytics, ticket articles, every moderator dashboard and control desk, listing / posting / seller-history modals, restrictions desks, dispute and ticket desks and modals, and platform view's Moderate panel.
- **Silent and safe.** Live reloads keep what is on screen (no first-load spinner or error toast), never overlap, wait while the tab is hidden, and keep typed reasons, picks, unsaved settings drafts and open dialogs. A settings section saved by someone else while being edited shows a notice.
- **Chat.** Ticket and dispute chats keep their room listeners; the ticket chat re-reads its thread after a reconnect, and both case files follow standing, contract, escrow and listing changes.
- **Recovery.** A reconnect re-reads every open view once; while the socket is down views re-read every 45 s.

# Parallel task: team penalty member scope

## Objective

When staff ban, suspend or lock a team, they choose who else gets the same penalty: the team leader, specific members, or all members. There is no "team only": a team penalty always reaches people. Lifting the team lifts team-linked penalties for the chosen scope. See docs/punishment-system.md §8.10.

## Acceptance Criteria

- **Server.** `memberScope` `leader` (default) | `selected` (+ `memberAccountIds`, active members of the team) | `all` on `PATCH /api/admin/accounts/:accountId/status` and the platform-view action; `includeLeader: true` maps to `leader`. `none`, `includeLeader: false`, unknown scope, empty or non-member picks, and `leader` on a team with no active leader → 422 before anything changes.
- **Guards.** Members already as strict or stricter are skipped. A leader or chosen member staff may not act on stops the whole action; with `all` they are skipped and named.
- **Lifts.** Only penalties applied together with this team (latest standing change carries `viaTeamAccountId`) are lifted, for members in scope.
- **Record.** Each member's reason says it came with the team; the team record gets `TEAM_LEADER_STANDING_CHANGED` / `TEAM_MEMBER_STANDING_CHANGED`; the summary lists who changed and who was skipped.
- **UI.** The team status modal and platform-view dialog (admin and every moderator console) show three choice cards tinted with the action's color (leader, specific members, all members), a "Team + N people" count and a searchable member picker with avatars, leader and standing chips; a leaderless team starts on all members. Bulk team actions offer each leader / all members as the same cards.

# Parallel task: no contract workspaces in verification views

## Objective

Contract workspaces (`teams.team_type = 'contractual'`) are job/gig scaffolding and never verify, so no staff verification view lists or counts them.

## Acceptance Criteria

- **Admin dashboard.** `GET /api/admin/dashboard-overview` leaves contract workspaces out of `verificationQueue`, the `pendingVerifications` KPI / alert and the `pending_review` fallback count (`backend/repositories/AdminRepositories.js`).
- **Moderation desk.** The identity queue (users only) and business-verification queue keep excluding contract workspaces (`AdminModerationRepositories.js`), as do the Team accounts lists every moderator console reuses (`fetchTeamsFromDatabase`).
