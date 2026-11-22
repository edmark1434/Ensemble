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

# Parallel task: admin dashboard Members card

## Objective

The admin dashboard's member breakdown shows member health, not one lone bar.

## Acceptance Criteria

- **Server.** `GET /api/admin/dashboard-overview` adds `memberHealth` (`fetchMemberSummary` from Analytics plus `pulse`: signups this week and the week before, members active in 7 days, members with active warnings, running forum timeouts). Either read failing gives null figures, never a failed dashboard; `breakdowns.usersByStatus` stays as the fallback.
- **Members card.** A stacked standing bar and every standing (zeros dimmed); rows with members open User & Team → Users filtered by `?status=`. ID-verified and complete-profile meters, a link to the identity queue when IDs wait, and four last-7-days tiles linking to Users, Analytics → Members and Restrictions.
- **Staff by role.** Each role shows how many are online now, and the card names roles with nobody online.

# Parallel task: replace asset files before live, report holds on jobs and gigs

## Objective

A seller can swap an asset's files while it is not live yet (for example when the review team suspects a copyright problem and asks for a new version). A sanctioned job or gig report takes the reported posting off the board, and the owner is told why and that they can open a support ticket.

## Acceptance Criteria

- **Asset files.** The editor lets the owner remove current files and add same-type replacements while the asset is not published, not a template and has no buyers; saving sends it to review. A published asset keeps the "Asset file is locked" notice, and the server returns 409 `ASSET_FILE_LOCKED` for `replaceMedia` on it (service check plus the locked row).
- **Report → posting.** Sanctioning a job or gig report takes `postingAction` `pause` (default) | `archive`. After the sanction is saved the posting is paused, archived, or (already paused / closed) put on hold; already archived is skipped. A failure is shown to staff and never undoes the sanction. The report modal on every desk shows the Pause / Archive choice and the outcome.
- **Hold.** Migration `1830600000000_posting-staff-hold` adds `staff_hold_at` to `jobs` and `gigs`. Staff pause / close / archive set it, staff reopen clears it. While held, the owner's gig toggle and a job edit that changes `status` return 403 `POSTING_STAFF_HOLD` with ticket instructions.
- **Notice.** Every staff posting change notifies the owner (`notifyPostingOwner`): pause / close / archive notices give the reason (and the report number when there is one) and link to `/support/ticket?type=Appeal a jobs action`; reopen notices link to the posting.

# Parallel task: teams are read through their members

## Objective

Teams have no warnings, disputes or merit of their own. Every team penalty (warn, timeout, suspend, lock, ban) reaches the people staff pick, a team's record shows its current members' warnings and disputes, team merit is the members' total as a percentage, and ownership transfer works properly from both the staff desk and the team page. See docs/punishment-system.md §8.10.

## Acceptance Criteria

- **Warn and timeout scope.** Team warn (`POST /api/admin/accounts/:id/warn`), timeout and clear-timeout take `memberScope` `leader` | `selected` | `all` like bans (`TeamSanctionServices.warnTeam` / `changeTeamTimeouts`). People are checked before anyone changes; members already timed out are skipped; clearing ends only timeouts set with the team. The Teams desk warn / timeout modals and platform view show the same choice cards (no "Team +" count: only people change).
- **Members-only record.** Teams desk "Members' warnings & disputes" (`TeamRecordModal`) lists current members' warnings and disputes, tagged and filterable per member, with a member table (merit bar, standing, warnings, disputes, timeouts, automatic punishments). No team-account warnings or disputes.
- **Team merit %.** `memberMerit.percent` = members' merit total ÷ (100 × members), rounded down (5 × 100 → 100%; one at 50 → 90%). Shown on the team overview, the record, the Teams list (sortable, "Members at low merit" filter), platform view and team `CaseAccountSummary`.
- **Ownership transfer.** `TeamOwnershipServices`: active member in good standing, no contract workspaces, locked roster transaction, notices, chat roles, project access, live refresh, team record. Owner side: Transfer Ownership in the team menu, Members tab header and a crown per member; picks the new owner and their own role, types the team name to confirm; plan team limit checked. Staff side: redesigned modal (hand-off strip, searchable candidates with merit and standing, role cards, what-happens list).

# Parallel task: team members in contract disputes

## Objective

A client disputing a contract whose freelancer side is a team (team account, or the contract workspace's included members and subcontractors) chooses who answers for that side: the team leader (default), specific people, or everyone. Named people can follow and answer the case like the disputee, staff see and change them, and a dispute ban reaches them through the team rules. Team parties work end to end on the member side, and the team "owed to members" reserve follows dispute reversals. See docs/api.md "Contract disputes" → "Team members in a dispute".

## Acceptance Criteria

- **Data.** Migration `1830500000000_dispute-members` adds `dispute_members` (soft removal, who named them) and `disputes.respondent_member_scope`.
- **Client only.** `GET /api/contracts/:contractId/dispute-members` returns the freelancer side's roster for a client filer; a freelancer filer gets `canNameMembers: false`. Filing takes `memberScope` `leader` | `selected` | `all` (+ `memberAccountIds`), checked under the filing lock; a freelancer sending `selected`/`all` gets 422 `DISPUTE_MEMBERS_CLIENT_ONLY`; stale picks 422 `DISPUTE_MEMBERS_NOT_FOUND`; leaderless + `leader` 422 `DISPUTE_MEMBERS_NO_LEADER`.
- **Form.** The dispute form shows "Who answers on their side" (three cards, searchable picker with avatars, Leader / On this contract chips, "Everyone on this contract" quick pick) in light and dark, and names the filer's own team correctly when filing for a team.
- **Access.** Cases, the public page and replies treat a team party's active Owners and Admins as that party, and named people as the disputee side once public. Notices and live updates to a team account reach those people.
- **Staff.** The dispute console shows a team chip, the named people in Parties (with "Change who is named": `action: "set_members"`), and a "Disputee's team" case-file section (roster, standing of named people, team wallet with what this contract still owes members, people taken off).
- **Punishment.** Ban and settle-and-ban accept `memberScope` / `memberAccountIds`; the default is the named people, else the leader. Team members go through `TeamSanctionServices`; others are banned with a reason naming the dispute; the ruling and response name who else was banned or skipped.
- **Swap.** `swap_parties` takes named people off (removed rows kept) and says so in the notice.
- **Escrow.** Team wallet reserve and contract fund distributions count releases net of standing dispute reversals (`lib/TeamContractReserve.js`).

# Parallel task: Forum Control member view and forum Trends

## Objective

Forum moderators see the forum close to how members do (avatars, group pictures, post bodies, images, threaded replies), and the Forum dashboard's Trends section shows real activity for a range they pick. See docs/api.md "Forum content moderation" and docs/frontend.md (Forum Control, Forum dashboard).

## Acceptance Criteria

- **People and pictures.** Forum desk payloads carry `avatarUrl` and `subscriptionPlan` on every person, `excerpt`, `images`, `imageCount` and `groupImageUrl` on discussions, `memberPreview` on group rows, `images` / `isEdited` on comments, and pictures / authors on the dashboard's recent groups and discussions. Identity lookups are chunked so a full group page never drops avatars.
- **Member view.** `ForumModerationDesk` (admin Management → Forum and Forum Control) defaults to cards laid out like the member forum (post cards, group cards with banners and member avatars), with a Table layout kept per browser. Every card and both detail dialogs open the member page in platform view; content members cannot see says why.
- **Detail dialogs.** The discussion dialog shows the post as members see it (formatted body with a plain-text toggle, images with a viewer, likes / replies / saves) and a threaded comment list with avatars; the group dialog shows the banner, owner and roster with avatars and role chips. All existing actions, guards and reasons are unchanged.
- **Deep links.** `/moderator/forum/forum-control?group=<id>` and `?discussion=<id>` open that review; closing clears the param. Dashboard recent lists and busiest groups link there.
- **Trends.** `GET /api/moderator/forum/trends?range=7d|30d|90d|12m` (default 30d, anything else 400) returns per-bucket discussions, replies, members posting, new groups, content taken down, forum reports, forum tickets and staff forum actions, totals against the period before, status / target / action-kind mixes for the range, and the busiest groups and members. Either store failing leaves its half empty with a note. The dashboard has a 7D / 30D / 90D / 12M picker kept in `?range=`, keeps the last range on screen while a new one loads, and re-reads live.

# Parallel task: marketplace permanent reject, forum lock and pin indicators

## Objective

Marketplace staff can reject a listing for good so the seller can never resubmit it, and members see clearly when a forum discussion is locked or pinned instead of a generic "Failed to post reply" error. See docs/api.md "Marketplace submission review" and "Forum content moderation".

## Acceptance Criteria

- **Permanent reject.** Migration `1830700000000_marketplace-listing-permanent-reject` adds `marketplace_listings.permanently_rejected_at` and the `rejected_final` thread kind. `PATCH …/listings/:id` `{ status: "rejected", permanent: true }` (message required) sets it, also on an already rejected listing; a plain reject lifts it, approval clears it.
- **Seller blocked.** Resubmitting from the asset page or by saving edits returns 409 `LISTING_PERMANENTLY_REJECTED`; the seller's review panel shows "Permanently rejected" and no composer; the notification says it cannot be resubmitted.
- **Marketplace Control.** "Reject permanently" in the row menu and the listing modal (pending, scheduled, approved, delisted, rejected), with a warning in the decision dialog; permanently rejected rows show a "Permanently rejected" pill and chip; "Allow resubmission" lifts it.
- **Locked discussions.** Only forum staff can comment on a locked discussion (423 `DISCUSSION_LOCKED`, checked again at write time). Member pages (feed, group, discussion) show a Locked chip, hide Reply buttons and replace the comment box with a "Replies are locked" notice; a 423 shows that notice and a toast instead of "Failed to post reply".
- **Pinned discussions.** Pinned posts show a Pinned chip and an emerald edge, and stay on top of a group's feed (except Popular), including after a live pin or unpin.

# Parallel task: ticket form case IDs and per-category ticket limit

## Objective

Members are not asked for a "Case ID" they were never given, and nobody can pile up open tickets in one category.

## Acceptance Criteria

- **Appeal forms.** "Appeal a marketplace action" asks what happened (listing rejected / permanently rejected / delisted, selling restricted, other) and, for a listing decision, the listing (required picker); the case number is optional. Forum and jobs appeals keep their fields but the case number is optional.
- **Limit.** At most 5 open tickets per category (support area, Forum, Marketplace, Jobs and Gigs); the sixth is 409 `TICKET_CATEGORY_LIMIT`. Account penalty appeals are exempt.
- **Form.** The type card shows "N of 5 open tickets used"; a full category shows a notice with a link to Cases and disables Submit.
