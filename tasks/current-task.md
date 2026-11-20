# Editor marketplace and asset library

Fix reporting and marketplace media access in the editor, and update the main-site asset library.

- Members can submit a valid report, dismiss the dialog, and resume editing.
- Platform-posted images, videos, and audio with ready previews can be added like member listings.
- Active project licenses retain playback, reuse, and export access after listing deletion. Deleted personal uploads still show Missing media.
- Moving a listing to Trash preserves project licenses and unused purchases. Export can assign an existing purchase or the creator's license at zero cost. A previously published, unlicensed clip can still use its watermarked draft. Portfolio exports check only assets in the selected clip.
- Asset cards align the owner footer and omit the upload date. The shared site dropdown filters by media type and resets pagination.
- Group Discover, Purchased, Liked, and Saved separately from My Assets, Analytics, and Trash. Show all five media types in the dropdown at once.
- Editor and portfolio render requests omit missing clips, including inside scenes, and remove their track and transition references while preserving timing. For taken-down, unlicensed assets, the canvas and timeline display a status label in place of purchase controls.

---

# Task: Credits & economy ledger filters and linked entries

## Implementation Objective
The Credits & Economy desk (Admin and Support Moderator) ledger had filter gaps and one-way links: a fee row could not show what it was charged on, the parent only showed a bare fee id, and staff had to search for linked rows by hand. Every link now opens directly, filters are complete and shareable, and alert links open exactly what they count.

## Acceptance Criteria
- Each ledger row returns `fee` (amount, status), `feeFor` (the movement a fee row was charged on), `reverses`, `reversedBy` and `cashout` (payout reference and provider status). Rows show chips for them that open the linked entry.
- `GET /api/admin/economy/ledger/:transactionId` (Admin, Support Moderator) returns the entry, its direct links and up to 25 rows of each group (contract escrow, same reference, same dispute) with totals and the ledger filter for "show all". Support gets 404 for rows touching staff wallets, and staff rows are left out of links and groups.
- `?tx=<id>` opens `LedgerEntryModal` from any tab, the wallet modal, the overview's latest entries and a wallet's staff adjustments. Linked rows open in place with Back.
- Ledger filters live in the URL (shareable, survive reload and Back). New: max amount; wallet scope with In/Out; account, contract, reference and dispute scopes as removable chips; categories for staff grants, staff deductions, adjustments with no recorded direction, unpaid cashouts and reversing entries; quick views; date presets; reset from the empty state.
- From / To use the viewer's calendar days (`tzOffset`), not the database's.
- Search ignores a leading `@` and escapes `%` / `_`. A full UUID matches any id on the row exactly (transaction, wallets, the account's wallet, reference, dispute, contract escrow, fee and reversal links). Other text matches names, handles, member name and email, adjustment reason and author, reference type, cashout reference, and the start of any id.
- Ledger paging joins display columns only for the returned page.
- Alert and overview links carry their real window: failed in 7 days, large adjustments in 24 hours, adjustments with no recorded direction in 30 days, unpaid cashouts (not every cashout), and Pending / Failed / Reversed counts over the flow window.
- "All (CSV)" exports every matching row (up to 5,000); the CSV has fee, reversal, contract and payout columns.
- Wallet status filter accepts every status the dropdown lists (it was a 400 for anything outside five values). Wallet search ignores `@` and takes a full wallet or account id. Wallets, Holds and Ledger go back to page 1 when a page comes back empty.
- Migration `1829700000000_ledger-link-indexes` adds indexes for the reverse lookups and scopes. Everything works before it is applied, only slower.
- User preference: do not run automated build or verification commands.

### Follow-up: accurate overview, exact click-through, simpler desk
- Every overview figure and alert opens a ledger / wallet view built from the same SQL the figure was counted with (`FLOW_KIND_SQL` / `LEDGER_KIND_SQL`, status `settled` = Completed + Reversed, rolling `sinceHours` / `olderThanHours` on `LOCALTIMESTAMP`). The ledger shows the entry count and the credit total of all matching rows (`totalCredits`) so a figure can be checked against it.
- Money movement is split without overlap: Issued to members (top-ups, returned by the platform, other platform payouts, staff grants), Collected by the platform (platform fees, cashouts, other, staff deductions), Between members (escrow funded / released / refunded, marketplace sales / refunds, transfers). Fixed: escrow "paid out" counted fees taken from escrow; "Refunds" mixed platform refunds into member activity; "Between members" total showed all movement.
- Support Moderator figures (flow, pending, failed, unpaid cashouts) leave out rows touching staff wallets, as its ledger does. Unpaid cashouts are counted from their ledger rows, so the count and credits match the ledger.
- Locked in escrow opens contracts still holding escrow; Platform wallet opens its entries; wallet-health counts open the matching wallet filter.
- Wallets and Holds filters live in the URL too (reload and Back keep the exact view). Overview links add a history step so Back returns to the overview.
- Simpler UI: alerts only on Overview (count badge on its tab); one "Show" picker replaces Category + Type, with fees grouped under "Platform fees"; plain row titles ("Marketplace sale", "Platform fee", "Staff grant"); one short chip per link (Fee 50 · Source · Original · Reversal); 5 quick views; Period picker; dates and amounts under More; one Export CSV.

---

# Task (parallel): One appeal per penalty

## Implementation Objective
An "Appeal an account penalty" ticket used to cover the whole account: one open appeal at a time, accepting it ended every ban, lock, suspension, forum timeout and credit hold at once, and a denial blocked every appeal on the account for 12 months (or for good). Each punishment now gets its own appeal: the member picks the penalty, staff decide it on its own, and the decision only touches that penalty. Staff choose how an accepted penalty is lifted and may follow a denial with a suspension or ban; the decision is posted as a decision card like a dispute ruling.

## Acceptance Criteria
- Migration `1829400000000_per-penalty-appeals`: `tickets.appeal_target_type` (`ban` | `lock` | `suspension` | `forum_timeout` | `warning` | `credit_hold` | `merit_penalty`), `appeal_target_id`, `appeal_target_label`, `appeal_target_started_at`, `appeal_outcome` (JSON), `appeal_decision_note`; a partial unique index allows one undecided appeal per penalty. Old appeals keep NULL targets.
- Penalty identity: warning = `violations.violation_id`; forum timeout = `restrictions.restriction_id`; ban / lock / suspension = the `ACCOUNT_STATUS_CHANGED` activity row that moved the account into that status (an extension keeps the same penalty); credit hold = `<wallet_id>@<frozen_at>`; automatic merit punishment = `merit_penalties.merit_penalty_id` (the automatic suspension is appealed as the suspension).
- `GET /api/users/appeals` lists the member's active penalties, each with its appeal state (available, open, accepted, denied until a date, denied permanently, covered by an old account-wide hold). Banned and locked members can read it.
- Filing (`POST /api/users/tickets` with `appealTarget: { type, id }`) needs an active penalty; refused when that penalty already has an open appeal, was accepted, was denied less than 12 months ago, or was denied permanently. Other penalties are unaffected. A decision older than an extension / re-issue of the penalty does not hold it. An open pre-change (account-wide) appeal still blocks new appeals until it is decided.
- Accept: only the appealed penalty changes. Staff pick: lift within 24 hours (default), lift now, or shorten to an earlier end (never later than planned). A warning is rescinded at once (band, merit and the automatic punishments it started follow). A penalty that already ended or changed is left alone and the decision is still recorded.
- Deny: holds only that penalty (12 months, or permanently). Optional further action in the same step: a named suspension or ban from the punishment catalog (custom days or permanent), with the reason the member sees. Checked before the decision is saved (no suspension over a ban or lock, no self or staff target unless Admin). Old `account_appeal_holds` rows still cover the penalties that existed when they were decided.
- The decision is posted in the ticket chat as a decision card (`messageType: 'appeal_decision'`), styled like the dispute ruling card, for members and staff: penalty, outcome, staff note, further action, when it can be appealed again.
- Fixed: after a decision, "Save changes" sent the stale "In Progress" status and reopened the appeal. The modal now resets its fields from the decided ticket, never sends a status for a decided appeal, and the server refuses to reopen a decided appeal (409).
- Staff: the case file and decision sidebar show which penalty is under appeal, whether it is still active, exactly what each choice does, earlier appeals on the same penalty and the account's other penalties. Staff opening an appeal for a member pick the penalty.
- Member UI: `/account/appeal` lists every penalty with its own Appeal button / open-appeal link / decision; the form is per penalty; the generic ticket page sends appeals there. Decision notices name the penalty.
- Works before the migration is applied: appeals fall back to the old account-wide behaviour.
- User preference: do not run automated build or verification commands.

---

# Task (parallel): Timed automatic merit punishments

## Implementation Objective
Automatic punishments no longer follow Platform Merit live. When a warning takes merit down to a threshold level, that level's punishment starts and runs a fixed number of days: it does not end when the warning expires, staff lift points, or merit recovers, and it never changes merit. Deeper drops cross harsher levels, so punishments add up (e.g. merit 90 → Mute 3 days, merit 85 → Mute 5 days).

## Acceptance Criteria
- Migration `1829300000000_timed-merit-punishments`: `warning_thresholds.duration_days` (every row), new effect `mute`, unique per (min_points, effect), `none`/`record` rows retired, `suspend_days` / `lift_at_merit` / `accounts.auto_suspend_lift_merit` dropped; new `merit_penalties` table. Seed: 97 Limited 3d, 92 Restricted 5d, 90 Mute 3d, 85 Mute 5d, 84 Frozen access 7d, 80 auto-suspend 7d, 70 auto-suspend 14d. Members already in a band keep the strictest one on a fixed clock from their latest active warning; running auto-suspensions get a record row.
- Engine (`MeritPenaltyServices.applyMeritPunishmentsForWarning`, both warn paths): rules crossed by the warning's own jump (points before it → after it) start once per drop; per type the longest starts. Same type: the latest end wins; different types run side by side; product checks use the strictest running band. Auto-suspend extends a running suspension that would end sooner, never shortens one, never overwrites a ban or lock.
- Mute: no forum posts/comments/reactions/new groups (reports open), no marketplace comments, no new conversations; existing job/gig/contract threads open. Enforced in `assertWarningAllows`, `rejectForumTimeout` and forum socket events.
- Ending early: Admin/Support "End early" (`POST /api/admin/accounts/:id/merit-penalties/:penaltyId/end`, staff-only reason; not for auto-suspend); pardon ends all; rescind / Admin Moderation reverse ends the ones that warning started (and an auto-suspension it caused); any staff status change closes the auto-suspension record; accepted appeal (per penalty, appeals task) ends it in 24h / now / earlier. The one-minute sweep closes finished ones and tells the member what is still running. Removed: auto-suspension early lift at a recovery merit.
- Lift points only change merit; the lift panel says running punishments keep their end dates and offers "Back above merit N" quick lifts.
- Staff UI: `/admin/warnings` → Merit punishments (rule = "when merit drops to N" → punishment → days); `MeritPenaltiesPanel` in the Admin history modal and the moderator Restrictions desk; running punishments on desk chips, the case summary and the admin profile.
- Member UI: status bar / How to fix show `merit_limits` (strictest band) and `muted` with fixed end dates and "runs its full time"; forum locks show "Muted" / "Low merit" with when posting returns; Record lists automatic punishments; merit ring tiers are neutral (Trusted / Good / Fair / Low / Very low).
- Runs before the migration too: bands then follow points live and rule edits say the migration is needed.

### Follow-up: rebalance, Unfreeze, status next to merit
- Migration `1829600000000_rebalance-merit-punishments`: gentler seed (95 Limited 1d, 90 Mute 1d, 85 Mute 2d, 80 Restricted 2d, 75 Frozen access 3d, 70 auto-suspend 3d, 60 auto-suspend 7d). Only untouched first-seed rows are replaced; bands and mutes they already started are shortened to the new length of their kind. Running suspensions are left alone.
- Unfreeze (Admin / Support): `POST /api/admin/accounts/:id/merit-penalties/end` `{ reason, penaltyIds?, effects? }` ends several (default all) running bands and mutes; the member is told what ended and what is still running. UI: Users list row menu "Unfreeze (end automatic limits)" (shown when something is running) → modal with checkboxes; "Unfreeze all" in the Automatic punishments panel (history modal, Restrictions desk).
- Status next to merit: merit tiers cut at the ladder levels (Trusted / Good 96–99 / Fair 86–95 / Low 76–85 / Very low ≤75). Owner: profile merit ring and Performance card list what is running ("Mute · Nov 24, 3:00 PM" or "No limits running"); Record shows "Running now". Staff: running punishments next to merit in the Users list, history, profile, Restrictions desk, jobs and marketplace moderator detail, ticket case panel (`meritPenalties` in those payloads). Visitors see the tier and public chips only.

### Follow-up: ladder starts at merit 60, "You're unfrozen" notice
- Migration `1829700000000_merit-punishments-start-at-60`: 60 Limited 1d, 55 Mute 1d, 50 Mute 2d, 45 Restricted 2d, 40 Frozen access 3d, 30 auto-suspend 3d, 20 auto-suspend 7d. Untouched seeded rows only. Running punishments from seeded rules that the new ladder would not give at current merit end via the sweep (`end_reason = 'rebalanced'`); automatic suspensions left with no record get `suspension_ends_at = NOW()` and the standing sweep lifts them.
- One ending notice for every path (`notifyPunishmentsEnded`): time ran out, Unfreeze / End early, pardon (new), appeal, rescind / reverse, rule change. Frozen access ending → "You're unfrozen: …" (`ACCOUNT_UNFROZEN`, green "YOU'RE UNFROZEN" toast); others `MERIT_LIMIT_ENDED`; starts `MERIT_LIMIT_STARTED`. Labels and icons for these plus `WARNING_UP` / `WARNING_DOWN` in `notificationTypes`.
- Merit tiers: Trusted 100, Good 80–99, Fair 61–79, Low 41–60, Very low ≤40.

---

# Task (parallel): Editor ChunkLoadError after deploys

## Implementation Objective
`editor.ensemble.software` crashed with "Application error: a client-side exception" (ChunkLoadError, `/_next/static/chunks/*.js` 404). The chunk was briefly missing during a deploy, and because Next's static 404 has no Cache-Control, Cloudflare cached the 404 at the edge and gave browsers `max-age=14400`, so the editor stayed broken after the file was back.

## Acceptance Criteria
- `video-editor/server.ts`: any 4xx/5xx response under `/_next/` is sent with `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`; successful asset responses are unchanged.
- `video-editor/src/app/global-error.tsx`: a ChunkLoadError reloads the page once (30 s sessionStorage guard, no auto-reload without storage); other errors show a Reload card in the existing theme instead of the bare Next error screen.
- Ops (outside the repo): purge Cloudflare's cache for `/_next/static/` once after deploying this, and avoid running `next build` in the live `.next` directory while the server is serving from it.
- User preference: do not run automated build or verification commands.

---

# Task (parallel): Evidence uploads when filing a dispute

## Implementation Objective
Members can attach evidence (images, PDFs, videos) on the File a Dispute form instead of having to reply in the case afterwards.

## Acceptance Criteria
- `DisputeFormPage`: optional "Evidence" picker (shared `appealAttachments` helpers: up to 4 files; images 8 MB, PDFs 15 MB, videos 50 MB). Files upload to `chat-attachments` (the same folder dispute replies use) when the member submits, and go with `POST /api/contracts/:contractId/dispute` as `attachments`. If an upload fails, the toast names the file and nothing is filed.
- Server: `createContractDispute` keeps only valid staging keys (`normalizeDisputeAttachments`, max 4). Once the case is committed, `postDisputeFiledEvidence` posts them as the filer's first reply under the case summary, visible only to the filer and staff (`author_and_staff`).
- If the files cannot be posted, the dispute is still filed and the response has `evidence: { sent, posted, failed }`. The form then tells the member to add the files again by replying in the case.
- User preference: do not run automated build or verification commands.

---

# Task (parallel): Staff credit changes in the logs; partial and timed credit holds

## Implementation Objective
Staff grants, deductions and credit holds are self-transfers on the ledger. The member's Transaction History showed an adjustment as an "Internal ↔ Sent Credit Transfer" with no sign or reason. The staff Users / Teams credit feed showed every one as "+" (and quieter accounts got no rows, because the feed read only the newest 500 ledger rows overall). Both logs now show what staff did. A freeze can hold a chosen amount and release at an exact date and time.

## Acceptance Criteria
- `lib/StaffLedgerNotes.js` joins each self-transfer to its audit row: CREDITS_ADJUSTED by ledger id; CREDITS_FROZEN / CREDITS_UNFROZEN by `metadata.creditTransactionId`, or by wallet, type and time for older rows.
- Member Transaction History: grants are Incoming "Credits Added by Staff" and deductions are Outgoing "Credits Removed by Staff", each with the member-facing reason. Holds and releases show as "Held by Staff" / "Hold Released". A hold shows its reason and when it was set to end. A release note (staff-only) is never shown. These categories are on the Credits tab, in the filters and in the guide. The page reloads on `account:credits_adjusted` and `ensemble:wallet-changed`.
- Staff Users / Teams credit feed: 8 rows per account. Grants are +, deductions −, an old adjustment with no recorded direction is neutral, and holds are amber (− when frozen, + when released) with the reason and release time.
- Freeze takes optional `amount`: empty means every spendable credit. More than is spendable is a 409. The rest stays spendable and the member's notice names the amount held. Release: until reviewed, after N days, or an exact `endsAt` date and time (future, at most 365 days). The same form (`CreditHoldFields`) is used in the economy desk Freeze dialog (in bulk, the amount applies to each wallet) and in the Users / Teams credit modal.
- No migration.
- User preference: do not run automated build or verification commands.

---

# Task (parallel): Moderator desks on staff.ensemble.software
# Task: Asset Library Trash Adjustments & Seller Dashboard

## Implementation Objective
1. Remove "Delete permanently" functionality from the Trash tab and Asset Details view so soft-deleted assets can only be restored, preserving data integrity for any buyers or projects using them.
2. Add a comprehensive Seller Dashboard within the Asset Library (`/assets/seller`) tracking:
   - Total net revenue earned in credits
   - Total sales count across all assets
   - Overall unique buyers count
   - Active marketplace listings count
   - Per-asset sales, buyers, and revenue performance breakdown
   - Recent sales transaction history

## Acceptance Criteria
- `staff.ensemble.software` (and `staff.localhost:5173`) serves `/moderator/*` with the same path (`staff.ensemble.software/moderator/support`); `/`, `/dashboard`, `/platform-view` keep mapping to `/staff/*`.
- Signing in on the staff portal lands on the moderator's desk on the staff host. Any main-site navigation to `/moderator/*` (page load or in-app) goes to the staff host with the same path, query and hash.
- Desk links to member pages still leave for the main site; moderator sign-out returns to the staff portal login.
- No backend change, no migration.
- User preference: do not run automated build or verification commands.

### Follow-up: member login no longer signs staff out
- Cause: in production the staff host called the shared API host, so staff and member sessions used the same `sessionId` / `accessToken` / `refreshToken` cookies; a member login in the same browser overwrote the staff session.
- The staff host now calls `/api` and `/socket.io` on its own origin, like the admin host (`consoleApiOrigin`), so it keeps its own session. Ops (outside the repo): the production proxy must forward `/api` and `/socket.io` (with WebSocket upgrade) on `staff.ensemble.software` to the API, as it does for `admin.ensemble.software`, before this frontend is deployed. Moderators sign in once more on the staff host after the deploy.
- The member site signs out any staff session it finds and the member `/login` refuses staff accounts with "Staff accounts sign in at staff.ensemble.software." (same rule as admin, via `consoleIdForAccount`).
