# Active Task (video editor): Export fails in production with "Invalid request origin."

## Implementation Objective

Editor API writes (export, media status, uploads, transcription, market asset/template actions) must accept
same-origin browser requests on `https://editor.ensemble.software` behind Cloudflare.

## Cause fixed

Routes compared the `Origin` header with `request.nextUrl.origin`. `server.ts` passes `hostname`/`port` to
`next()`, so in production `nextUrl.origin` is the internal listener (`http://localhost:3000`), never the public
URL, and every check returned 403. New helper `video-editor/src/lib/auth/request-origin.ts`
(`isSameOriginRequest`) compares the Origin host with `X-Forwarded-Host`/`Host` (as Next.js does for Server
Actions); all 9 call sites use it. A missing Origin is still rejected (uploads keep allowing it, as before).

## Acceptance criteria

- Export, media status checks, uploads, transcription and market actions work on the deployed editor.
- A request whose Origin is another site, `null`, or missing is still rejected with 403.
- Local dev (`http://localhost:3000`) keeps working.

## Status: Implemented — awaiting user verification (`pnpm typecheck`, redeploy editor).

---

# Active Task (staff console session): Dialogs hidden or cut off; phone layout

## Implementation Objective

Staff console dialogs must always open over the whole screen, with their header and close button reachable,
on desktop and on phones.

## Causes fixed

- Entry animations used fill-mode `both`, so they stayed "in effect" and made each animated block a containing
  block + stacking context: dialogs rendered inside the card and slid under the sticky header. Now `backwards`.
- Several page shells were `relative z-10` (Support dashboard/tickets, Marketplace/Jobs control, Disputes,
  Restrictions, ticket desk, skeleton, placeholders, Platform view), trapping their dialogs under the sidebar
  and the phone top bar. Now plain `relative`.
- Dialogs taller than the screen were flex-centered with no scroll, losing their top. `.staff-console`
  overlays now use `align-items: safe center` + `overflow-y: auto` with viewport-pinned backdrops; panel
  heights use `dvh`.
- Phones: page headers no longer stick under the top bar; Platform view fits below the bar; ticket dialog
  header is compact.

## Acceptance criteria

- Any console dialog (Admin and moderator) opens centered over the screen, above the sidebar and phone top bar,
  with its close button visible; a tall dialog scrolls from its top.
- Animations still play on page and tab entry.

## Status: Implemented — awaiting user verification (`pnpm typecheck`).

---

# Active Task: Contract dispute filing rules (ended contracts, per-side limit, 30-day window)

## Implementation Objective

Members can still file a dispute on a contract that has ended (Done, Completed, Closed, Cancelled,
Rejected) to report conduct, but its milestone payments are final: staff can record an outcome, dismiss,
or ban, and can never refund, settle or reverse credits on that case. Filing is limited to one open
dispute per contract, one dispute per side per contract, and 30 days after the contract ended.

## Changes (filing limits)

- Migration `1828800000000_contract-ended-at` adds `contracts.ended_at`, stamped by trigger
  `trg_contracts_ended_at` on every status change (backfilled with an estimate for ended contracts).
- `createContractDispute` refuses a second dispute by the same side (409 `DISPUTE_ALREADY_FILED`) and
  filing more than 30 days after the end (409 `DISPUTE_WINDOW_CLOSED`); rules in `disputeFilingBlock`.
- `GET /api/contracts` returns `dispute_filing` per contract; the dispute form and contract Actions menu
  block filing, show the reason, link to the viewer's earlier case, and show the window end date.

## Changes (conduct-only)

- Migration `1828700000000_dispute-contract-ended-at-filing` adds `disputes.contract_ended_at_filing`
  (filing-time snapshot; backfills open cases on ended contracts with no money ruling).
- `createContractDispute` sets the flag from the contract status inside the filing transaction.
- `applyFinancialResolution` refuses `settle_escrow` / `reverse_transaction` on flagged cases
  (409 `CONTRACT_ENDED_NO_REFUND`); case-file transactions are `reversible: false` with that reason.
- Staff modal: `dispute.conductOnly` hides Settle escrow and shows a locked note in Resolve.
- Dispute form lists `Completed` contracts too and explains that an ended contract can't be refunded.

## Acceptance criteria

- Filing on an ended contract succeeds (one open dispute per contract still applies).
- On that case, Settle escrow is not offered, Reverse buttons are gone with the reason shown, and the API
  rejects both actions even if called directly.
- A dispute filed on a live contract keeps every money action, including re-settling after a withdrawn ruling.
- A member who already filed on a contract can't file again there (the other side still can), and sees
  why plus a link to their case.
- 31 days after a contract ends, neither side can file; before that, the form shows the last day to file.
- A contract that goes back to a live status loses its `ended_at`.

## Status: Implemented — awaiting user verification (`pnpm typecheck`, `npm run migrate` for both migrations).

---

# Previous task (another session): Staff console UI polish and motion

## Implementation Objective

Make the Admin console (and the moderator consoles that share its shell) feel dynamic and professional with
light, non-janky motion, and fix layout/data lapses found in the scan.

## Acceptance criteria

- Phones get navigation: top bar + slide-in drawer (`ConsoleSidebar`); desktop sidebar has an animated active
  indicator, solid active state (no gradient), and a signed-in footer.
- First page loads show a layout-matching skeleton instead of a full-screen spinner (14 pages + `StaffOutlet`).
- Motion: page fade, staggered content rise, modal fade/pop, press/hover feedback, bar grow, count-up KPIs.
  Only opacity/transform; ends on `transform: none`; disabled under `prefers-reduced-motion`.
- Dashboard: clickable KPI cards that deep-link to the right tab, alert cards, live auto-refresh every 60 s
  while visible, activity timeline, proportional breakdown bars.
- Dashboard data fixes: the "Credits leaderboard" listed the newest signups and printed the join time twice;
  it now lists the members holding the most credits (linking to their wallet). "Credits in circulation"
  now includes held credits. The verification queue's always-empty Credits column is replaced by account type.

## Status: Implemented — awaiting user verification (`pnpm typecheck`).

---

# Previous task (another session): Dispute resolve flow (staff dispute modal)

## Implementation Objective

Fix the staff dispute detail modal (`ModeratorDisputeDetailModal`) used by Admin and Support Moderator:
close the dispute view automatically once a case is resolved, make resolution notes save and show
reliably, and let staff settle frozen escrow by milestone, by amount, or both.

## Changes

- Every closing decision (record outcome, settle escrow, reverse transaction, permanent ban, dismiss)
  closes the modal on success and refreshes the desk list. Non-closing actions apply the PATCH/POST
  response to the form instead of a full reload.
- "Save changes" sends only changed fields (status, priority, resolution notes), so an unchanged
  status cannot block a notes edit; toast says "Resolution notes saved".
- Dismiss now has an optional resolution notes field (prefilled from the sidebar) and sends it; before,
  notes were dropped on dismiss.
- Settle escrow: split method **By milestone** / **By amount** / **Both**.
  - By milestone: each unpaid milestone (status not completed/cancelled/abandoned, credits > 0) is
    "Refund client" or "Release to freelancer". Freelancer = picked total; client = the rest.
  - Both: picked milestones plus an extra amount (0..escrow − picked) to the freelancer.
  - By amount: the existing client/freelancer split.
- Backend `settle_escrow` accepts `splitMethod` + `milestoneIds`, validates them inside the settlement
  transaction (on the contract, unpaid, fit in escrow, freelancer share matches), logs them in the
  `DISPUTE_ESCROW_SETTLED` activity metadata, and lists them in the ruling message.
- Approved milestones can never be refunded. Each case-file milestone has an `escrowState`:
  `open` (staff choose), `approved` (completed but credits still in escrow: locked to the freelancer,
  a minimum freelancer share in every split mode, enforced on the server as
  `APPROVED_MILESTONE_NOT_REFUNDABLE`), `paid` (already paid out of escrow: shown locked, can't be
  picked), or `closed`.

## Acceptance criteria

- Resolving by any path closes the modal, the case shows Closed in the list, and reopening the case
  shows the saved resolution notes.
- Editing notes on an open or closed case and pressing Save changes persists them.
- Dismiss with notes stores the notes and posts them in the dismissal message.
- Milestone and Both splits always total the remaining escrow; the server rejects milestone picks that
  are not on the contract, already settled, or larger than escrow.
- No split (milestone, amount or both) can refund an approved milestone to the client. Approved-but-unpaid
  milestone credits always go to the freelancer, and already-paid milestones show as locked.

## Status: Implemented — awaiting user verification (`pnpm typecheck`).

---

# Active Task (upstream, another contributor): Subcontractor Verification Badge & Unverified Dimming

## Implementation Objective

Update the subcontractor search and nomination flow in `frontend/src/pages/user/3_teams/team_modals/SubcontractProposalModal.tsx` (and enforce in `backend/repositories/TeamProjectRepositories.js`) so that:
- Verified platform specialists display the verified badge (`/icons/verification/lvl2_verified.png`) in search results and selected candidate cards.
- Unverified specialists still appear in search results, but are visually dimmed (`opacity-50`, `cursor-not-allowed`), cannot be selected, and clearly indicate why they are disabled (not verified on the platform).
- Backend `createSubcontractProposal` rejects unverified candidates with a `422` error.

## Acceptance Criteria

- Verified specialists show the verified badge in the search dropdown and selected candidate list and can be added.
- Unverified specialists remain visible in search results, appear dimmed, cannot be clicked/added, and display a clear "Not verified on platform" / "Unverified" indicator explaining why.
- Search dropdown and candidate list use Glide-style listbox styling with a thin vertical scrollbar (`gs-listbox-scroll` / `scroll-thin`), and the milestone scope selector uses `GlideSelect`.
- Subcontracting terms note reminds the lead to know who they are subcontracting to and that the owner must confirm the invitation after inviting.
- Backend `createSubcontractProposal` validates `verifications.is_verified = true` for every candidate.
- No builds, type checks, lint, or other verification commands run unless explicitly requested.
