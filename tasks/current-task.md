# Current Task

# Parallel task: Restricted parties loads, and explains itself

## Objective

The staff "Live work with a restricted party" queue (Jobs, Support, Admin) loads instead of failing, and tells staff what it holds, what already happened on its own and what they can do.

## Acceptance Criteria

- **Loads.** `disputes.status` is the `dispute_status` enum, so `LOWER(COALESCE(d.status, ''))` failed the whole query. `RestrictedWorkRepositories` (list + stale-contract dashboard alert) and `MissedReviewRepositories` compare `d.status <> 'closed'` directly.
- **Explanations on demand.** No always-visible panel. Hover shows a popover, click keeps it open, Esc or a click outside closes it: ⓘ by the title ("Why this list exists": what's shown, what happened automatically, what staff can do) and ⓘ after the filters ("What each reason means" + the 7-day stale rule).
- **Rows.** Each contract has a "What to do" popover with the next step for its situation (open dispute, nothing in escrow, banned, locked, team leader, suspended with its end date) and a "7+ days, no dispute" marker matching the dashboard alert.

# Parallel task: admin badge grant reaches every member

## Objective

Admin → Badges → Grant can find and grant a badge to any member, not just the first 20 users by display name.

## Acceptance Criteria

- **Paged search.** `GET /api/admin/badges/recipients` takes `limit` (1–100, default 50) and `offset` and returns `{ recipients, hasMore }`. The Grant tab shows "Load more users" while there are more.
- **Better matching.** Search matches handle, display name, first/last name and email. An exact handle comes first, then handle and display-name prefixes, then the rest alphabetically.
- **Unchanged rules.** Members who already hold the badge (pending or claimed) stay disabled. Only `User` accounts can be granted.

# Parallel task: one report dialog for members

## Objective

Every place a member reports something looks and behaves the same.

## Acceptance Criteria

- **One dialog.** `components/report/ReportDialog` (portaled): flag header with the subject name, optional quoted preview, reason chips (grouped when the list is grouped), description with a counter and minimum, "Reports go to the … for review" note, inline server error, then a "Report submitted" confirmation that closes itself.
- **Used everywhere.** Forum (discussion, comment, group, member), job, gig, asset, profile, team, team project, team project member and chat message reports. Each keeps its own reason strings (the server checks some of them). Message reports keep the description optional.
- **No double feedback.** Callers no longer show their own success toast; the team page report surfaces the server's error in the dialog instead of a generic toast.

# Parallel task: ticket close now / in / on date

## Objective

Staff close a ticket from one place in the ticket modal: right away, after a chosen delay, or at a chosen date and time.

## Acceptance Criteria

- **Sidebar.** The Ticket → Closing box has "Close now" (hidden for an undecided appeal) and "Close later" / "Change time", plus Cancel while a close is scheduled.
- **Dialog.** Three modes: Now (closes at once through the existing status PATCH), In… (any number of minutes / hours / days, with 30 min, 1 h, 6 h, 1 d, 3 d, 7 d quick picks), On date (date and time). The scheduled modes use `POST …/schedule-close`.
- **Window.** The dialog shows the resulting close time, or the problem when it is under 5 minutes or over 90 days away (same limits as the server).

# Parallel task: view listing files from the ticket case file

## Objective

Staff can open the listing's files from a ticket's Case tab (e.g. "Appeal a marketplace action") instead of seeing only file names.

## Acceptance Criteria

- **Payload.** Case listing `asset.files[]` carries `mediaAssetId`, `mimeType`, `width`, `height`, `durationSeconds`, `proxyPath`, `thumbnailPath`, `position`.
- **Case card.** Each file row shows a thumbnail and a View / Hide button that opens `ListingFileInspector` inline (watermarked preview, expand).
- **Originals.** Admin and Marketplace desks can also open / download the original upload (logged, existing endpoints); other moderator desks get the watermarked preview only.

# Parallel task: platform revenue and profit in Admin → Analytics

## Objective

Admin → Analytics shows what Ensemble itself earns: total platform revenue, costs, net profit and margin for the picked range, the previous period and lifetime.

## Acceptance Criteria

- **Server.** `GET /api/admin/analytics-overview` adds `summary.platformRevenuePhp` / `platformProfitPhp` (KPIs), `money.earnings` (revenue lines, cost lines, profit, margin, `previous`), `money.lifetime`, and per-bucket `revenuePhp` / `costPhp` / `profitPhp` (docs/api.md). Cache key is `analytics:overview:v3`.
- **Revenue.** Subscriptions + (fee credits + official admin-asset sale credits) × credit value + top-up markup. Cashout fees are never revenue (the payout provider keeps them); the admin Cashouts panel no longer shows them, while the member cashout flow is unchanged. **Costs.** Staff grants + platform-wallet payouts (not top-ups or refunds) + top-up bonus credits − staff deductions. A failed cost read shows costs and profit as unavailable, never a failed page.
- **Money tab.** Revenue, costs, net profit and margin tiles; a Platform earnings statement with previous period and lifetime; a Lifetime revenue panel; a revenue / costs / profit chart (the line chart now handles negative values).
- **Overview.** Platform revenue and Net profit tiles. Every new figure has a glossary entry.

# Parallel task: every reason for reporting a person

## Objective

When a member reports a person, the reasons cover everything staff can warn a person for (docs/warning-system.md §6).

## Acceptance Criteria

- **One list.** `frontend/src/lib/reportReasons.ts` `personReportReasonGroups(context)` returns grouped reasons (Behavior, Content, Identity, Scams and payments, Jobs gigs and contracts, Other), plus team-project reasons for `team` and forum reasons for `forum`. Every reason is ≤ 50 characters (`reports.type`).
- **Used everywhere a person is reported.** Profile `ReportUserModal`, team project `ReportMemberModal` (grouped `<optgroup>`s) and forum `ForumReportModal` subject `member` (grouped, scrollable chips). Content reports (discussion, comment, group, job, gig, message, team) keep their own lists.

# Parallel task: what happens to a restricted member's work and resources

## Objective

When a member (or team) is suspended, locked or banned, nothing they offer stays actionable, nobody's credits are stranded, nobody is punished twice for being blocked, and an accepted ban appeal gives their work back without a ticket. Forum posts, comments and listings show the public standing chip. See docs/punishment-system.md §9, §9.1, §9.2, §11.

## Acceptance Criteria

- **Paused gate.** `lib/OwnerAvailability.js` (deactivated, live suspension / lock / ban, team leader banned / locked / missing). Job and gig browse hide them; proposals, invites, offers, offer signing, gig orders and confirmations refuse with 409 `OWNER_UNAVAILABLE` (nothing charged). Locked / banned creators' assets leave the catalog and stop selling (`ASSET_CREATOR_UNAVAILABLE`); suspended creators keep selling. Detail pages show a paused notice; owners see why.
- **Money.** Banned / locked / deactivated members can see and stop plan renewal (allowlists + appeal-page card); a permanent ban stops renewal. Transfers to deactivated / locked / banned wallets refuse (`RECIPIENT_UNAVAILABLE`); transfer errors no longer surface as 500.
- **Reach.** New DMs to banned / locked members, team invites to deactivated / locked / banned members and subcontract hires of unavailable members refuse. Discovery browse leaves out banned / locked members.
- **Live work.** Counterparties of live contracts are told when a side becomes suspended / locked / banned and when it can act again (staff, auto-suspend, expiry, reversal). Staff queue "Restricted parties" (`GET /api/moderator/restricted-work`) on Jobs, Support and Admin consoles with escrow and open dispute.
- **No double hits.** Missed-review warnings skip windows a penalty touched. Auto-abandonment refunds and cancellation auto-approval wait while the party is suspended / locked (+48 h).
- **Restore.** Migration `1830800000000_ban-cleanup-items` records what a ban closed. Accepted ban appeals restore by default (`restoreClosedItems`), unban offers `restoreBanItems`, User & Team shows *Closed by a ban* with restore; items changed since stay closed. Reversing an unban re-runs the clean-up.
- **Teams.** A banned / locked leader pauses the team's listings; Owners / Admins are told no ticket is needed, and told again when it ends.
- **Visibility.** `StandingChip` on forum posts, comments, members and owner, and on job / gig / asset authors; visitors do not see badges while banned, locked or Frozen.

# Parallel task: Analytics definitions, staff Reopen only for staff-closed postings

## Objective

Admin → Analytics explains every figure (what it is, how it is worked out, where it comes from) without crowding the page, and Jobs & Gigs Control only offers Reopen on postings staff closed.

## Acceptance Criteria

- **Popovers.** An ⓘ next to each tile, panel title and key row opens a popover with the meaning, formula, source and caveats (`analyticsGlossary.ts`, `InfoButton` in `analyticsInfo.tsx`). Clicks inside link tiles never navigate; Esc or a click outside closes it; it opens above the button near the screen bottom.
- **Definitions drawer.** A header "Definitions" button (every tab but Feedback) opens a drawer with a section per tab plus "Reading this page" (range, change badge, live figures, cache, members, credit value) and search across all terms. "All definitions" in a popover opens the drawer at that term.
- **Coverage.** Overview, Members, Community, Revenue & credits (Net cash, Cash in/out, Credits outstanding, MRR, records…), Operations and Traffic & rate limits.
- **Reopen.** A closed job or gig without a staff hold (owner closed it, every hire filled, or the application window ended) offers Pause / Archive instead of Reopen, and the posting dialog says why. `PATCH …/jobs/postings/:type/:id` with `status: active` on such a posting is 409 `POSTING_NOT_STAFF_CLOSED`. Staff-paused, staff-closed and archived postings keep Reopen / Restore.

# Parallel task: every staff decision names the staff member who made it

## Objective

Wherever staff approve, decline, reject, delist, pause, close, archive, remove, lock, pin, ban, freeze or grant something, the staff desks show who did it (name and role). Members never see staff names (sellers still see "Marketplace review team").

## Acceptance Criteria

- **Jobs & Gigs.** `lastStaffAction.by { name, role }` on posting rows; cards, the table's Status column and the review modal say "Paused by …"; the modal's Activity card shows the last staff action and its staff member, and Moderation history rows lead with "By …" (with the report number when there was one).
- **Marketplace.** `reviewedBy` carries `role`; the listing modal header says "Rejected / Delisted / Approved by …", the Record card shows the role, and the seller-history modal lists who decided each listing.
- **Forum.** Discussions and comments carry `removedByStaff` (or `removedByMember` for a group moderator / discussion owner), groups carry `archivedByStaff` / `archivedByMember`, discussion detail carries `lockedBy` / `pinnedBy`, group roster bans carry `bannedBy`, and both group and discussion detail carry `moderationHistory` (from `account_activity`, with who did each). Forum Control and the admin Forum desk show all of it; report cases and ticket case files name who removed or archived the content.
- **Video.** "Removed by staff" names the staff member from the project's history.
- **Verification.** User verification logs name the staff member (and role) behind the last approve / decline / resubmit request instead of "System"; team logs include the role.
- **Badges.** Current holders show "Granted by …".

# Parallel task: ticket catalog review and bug reports in every category

## Objective

The ticket catalog matches what Ensemble actually has, and members can report a bug from every ticket category, each routed to that category's desk.

## Acceptance Criteria

- **Bug reports.** Each category has its own bug report type (Account, Billing, Video Editing Platform, Messaging, Safety and appeals, General, Forum, Marketplace, Jobs and Gigs) with the same questions: where it happened (area-specific list), link to the page, steps, expected vs. what happened, how often, whether it blocks the member, error message. A blocking bug is filed as High priority. They count toward their category's open-ticket limit.
- **Missing types.** "Business verification" (Account, picks the team) and "Team funds and distributions" (Billing, picks the team); "Workspaces and team projects" (Jobs and Gigs, picks the contract).
- **Fixes.** Options cover real features (badges, comments and mentions, watermark / plan limits, trash and templates, license assignment, where a user was reported). "Delivery and disputes" asks whether a dispute was filed and points to the dispute form. "Editor problems" is crashes and slowness; a tool that behaves wrong is a video editor bug report. Unused `PUBLIC_TICKET_GROUPS` and `ROLE_TO_TICKET_TYPE` are removed.
- **Storage.** Migration `1830900000000_ticket-catalog-bug-reports` widens `tickets_type_enum` and seeds reply guides for the new types; `down` moves new-type tickets to the nearest old type.
- **Staff.** Bug reports get a "Bug report" case tab (area, frequency, blocking, page, browser, and other open bug reports in the same area); frontend catalog lists, descriptions and desk subtitles include the new types.

# Parallel task: Jobs & Gigs Control member view, paused / archived visibility

## Objective

Moderators see each job and gig the way members see it on the board, with moderator details underneath. Pause and archive do what the console says they do on the member side, and owners are told every time.

## Acceptance Criteria

- **Member view.** Jobs & Gigs Control defaults to cards laid out like the member board (cover, Open / Closed chip, price, title, description, skills, owner avatar with verification and plan). Each card adds post number, moderator status, staff hold, open reports, what members see now, the last staff action and its reason ("owner notified"), pipeline counts and the actions menu. The Table layout is kept per browser.
- **Payload.** `GET …/jobs/postings` rows carry `thumbnailPath`, `savesCount`, `slots`, `staffHoldAt`, `author.avatarPath / isVerified / subscriptionPlan` and `lastStaffAction`; the posting detail carries `thumbnailPath`, `savesCount`, `staffHoldAt` and the same owner fields.
- **Review modal.** A "Member view" section shows the card preview, what members and the owner see for this status, the staff hold and the last notice sent.
- **Status guide.** The desk explains the purpose of Active, Paused, Closed and Archived (members, owner, what comes next); the reason dialog says the owner is notified with the reason and an appeal link.
- **Board visibility.** Staff-paused jobs and gigs leave browse (owners still see their own). Staff-archived gigs (`deleted_at`) leave browse, saved gigs and the gig page, as archived jobs already did.
- **Notices.** Every staff pause / close / archive / reopen notifies the owner (already in place); the closed notice no longer claims the posting is hidden.
- **Owner page notice.** While a job or gig is paused or closed on a staff hold, its page shows the people who manage it a "Paused / Closed by the Ensemble team" notice: what that means, the reason (or a pointer to the notification), the report number when there is one, and an "Ask for a review" link to the "Appeal a jobs action" ticket. It comes from `ownerStaffHoldNotice` as job `staff_hold` / gig `staffHold`, only for people who manage the posting. A paused job shows "Application Window Closed" to everyone else.

# Parallel task: forum comment edit and delete history for staff

## Objective

When a member edits or deletes their own forum comment, moderators and admins can still read what it said before, for moderation. Members never see that history.

## Acceptance Criteria

- **Stored.** Each comment keeps a staff-only `revisions` list (`{ kind: 'edited' | 'deleted', comment, attachments, by_user_id, recorded_at }`). An edit that changes the text or attachments adds the version being replaced, and an author's own delete adds the comment as it was before its text is wiped (`ForumDiscussionServices.updateForumDiscussionCommentsServices`, `softDeleteForumDiscussionComment`).
- **Hidden from members.** `publicForumComment` / `publicForumDiscussion` strip `revisions`, so no member read or socket payload carries it.
- **Staff read.** `getModeratorForumDiscussionDetail` returns `comments[].revisions` (`kind`, `comment`, `images`, `by`, `recordedAt`, oldest first).
- **Desk UI.** In the Forum Control / admin Forum discussion dialog, an author-deleted comment shows its deleted text and images marked "staff only", and an edited comment has a "Show edit history" toggle listing the earlier versions, newest first.
- **Limits.** Edits and deletes made before this change have no history.

# Parallel task: ticket case file shows every linked record

## Objective

Whatever a ticket names (listing, asset, purchase, contract, job, gig, proposal, team, project, forum post or group, payout, a person) shows up in the staff Case tab with the details staff need, and can be opened. Members see their picked records as links in Cases.

## Acceptance Criteria

- **Listings.** The case listing card shows scheduled go-live time, "Permanently rejected", the seller's account status and the latest review-thread entries. "Appeal a marketplace action" shows what happened (`action_taken`).
- **Reviews.** "Asset reviews" lists the asset's reviews (the named reviewer's first) and treats a seller filing about their own asset as the seller. Contract cards show the ratings both sides left ("Gig reviews").
- **Reported owners.** A reported listing, job, gig, forum post or group shows its owner's standing.
- **Postings.** Staff hold and the requester's proposals (or a named proposal) on a job. Area appeals list actions on team-owned listings and postings too.
- **People and places.** Named usernames (other person, collaborator, affected member, reviewer) resolve to standing; Teams show the requester's and affected member's membership; projects show their roster; forum groups resolve from a link and show the requester's membership.
- **Copyright.** Linked jobs, gigs and forum posts resolve, not only listings.
- **Billing.** Payout references match cashout reference / disbursement ids; invoice ids match subscription invoices.
- **Every area.** All five desks (Admin, Support, Forum, Jobs & Gigs, Marketplace) share the panel. "Seller verification" / "Listing review" show selling eligibility; "Uploads and storage" shows the member's recent uploads; sections for a record the type never asks for (listing, contract, project) are left out instead of saying "none named".
- **Links.** Case records open in platform view; Details form answers and the member's "What you reported" link to the picked record (`formValues[].href`).

# Parallel task: ticket intake security, staff see assets that are not live

## Objective

Members cannot pile up or race duplicate tickets about the same thing, ticket replies and lookups are rate limited, and staff can still open a banned seller's (or any not-live) asset for information. A missing ffmpeg on the server no longer fails sellers' uploads for good.

## Acceptance Criteria

- **Same record.** A second open ticket by the same member naming the same record (picked id, id in a pasted link, listing ≡ its asset, reported person, payment reference, appeal case number) is 409 `TICKET_RECORD_OPEN` with the ticket to use; the form links to it. Self-reports are 400 `TICKET_SELF_REPORT`.
- **Races.** Intake runs under a per-member lock, so parallel submits cannot all pass the duplicate, same-record and category checks.
- **Limits.** Replies ≤ 5,000 characters (staff 10,000); `ticketReply`, `ticketAction`, `ticketLookup` and `technicalReport` route limiters; invite and rating errors never echo internal messages.
- **Staff asset view.** A live staff session reads the asset page, comments and reviews of draft / delisted / banned / trashed / seller-deleted assets with the listing state and a staff notice; writes and downloads keep member rules.
- **Media tools.** ffmpeg falls back from a missing bundled binary to `PATH`; a missing tool keeps jobs queued without using attempts (images keep running) and old ENOENT failures are re-queued once it works; staff see a readable error.

# Earlier task

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
