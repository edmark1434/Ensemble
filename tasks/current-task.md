# Current Task: Dispute Comment Moderation, Threaded Replies, Audience Indicators & Resolve Outcomes

## Objective (3) — audience indicators
Each party must be able to tell who else can read a message: a staff reply sent to the disputee only,
to the disputer only, to both parties, or to the public.

## Acceptance criteria (3)
- [x] Party payloads carry `viewerRole`; `audienceNotice` / `AudiencePill` in `disputeUi.tsx` label each message from the reader's point of view.
- [x] Badge + one-line explanation on the public dispute page and the disputer's private-notes panel.
- [x] A staff reply aimed at `disputer` / `disputee` / `parties` is no longer shown to everyone on the public page, so the labels are truthful. **Behavior change**: legacy staff messages with no stored audience resolve to `parties`, so on existing public disputes they become party-only.
- [x] Live updates respect the same audience rules (a targeted reply reaches that party and is dropped for everyone else).

## Objective (4) — Resolve prompt and automatic outcome message
Pressing Resolve asks how the case ended, records it, and posts the outcome in the discussion.

## Acceptance criteria (4)
- [x] `backend/lib/DisputeResolutions.js` holds the catalog: resolved by both parties, disputee/disputer refused to cooperate, disputer/disputee inactive, withdrawn, no violation found — each with the sentence it posts.
- [x] `PATCH .../disputes/:id` `action: "resolve"` with `outcome` + optional `resolution_notes` writes `status = closed` + `resolution_outcome` + `resolved_at`, posts the message, and notifies the parties.
- [x] Note required for "refused to cooperate" (both) and "no violation found".
- [x] Message audience is `public` on a visible case, `disputer` on a hidden one; resolve never forces a private case public.
- [x] Reopen (and any status patch off `closed`) clears `resolution_outcome`.
- [x] Resolve opens a popup with the options, a notes box and a live preview of the message; the sidebar shows "Closed as …" afterwards.
- [ ] Migration `1828000000000_dispute-resolution-outcome` is **written but not applied** — run migrations before deploying this code, and re-check the Resolve action against a real database.

---

# Previously: Dispute Comment Moderation & Threaded Replies

## Objective
On a public dispute, a reply from anyone who is not the disputer or disputee must be held private
(author + staff) until a staff member or admin publishes it. Add quote-replies to the dispute chat
for every side: community, disputer, disputee, staff/admin.

## Acceptance criteria
- [x] Non-party replies store as `author_and_staff` with `pendingReview`; parties still post straight to the public thread.
- [x] A held comment is visible to its author and staff only — no party notifications, no public-room broadcast.
- [x] The assigned handler is notified when a community reply is waiting for review.
- [x] Staff/admin publish a held comment with the per-message audience select or a "Make public" button; the thread flags it "Awaiting review".
- [x] `POST .../messages` accepts `replyToId` on both the member and the five staff routes; messages return `replyToId`.
- [x] A reply target must be on the same chat and visible to its author (400 missing / 403 hidden).
- [x] A member reply quoting a non-published message is itself held, so a quote cannot leak private text.
- [x] Reply UI (quote banner, quoted parent, jump-to-parent, Esc to cancel) on the public dispute page, the staff/admin dispute modal, and the disputer's private-notes panel.
- [x] `cd frontend && npm run build` (tsc + vite) passes; backend files pass `node --check`; dispute visibility/mapping logic checked against the real module.
- [ ] Not verified against a live PostgreSQL/MongoDB instance — handler notification and reply-target lookups still need a runtime pass.

---

# History: Workspace Chat Redesign, Portfolio Video Scrubber & Project Duration Enforcement

## Objectives & Completed Work

### 1. Workspace Channel Chat Full Feature Redesign (`ProjectChatTab.tsx`, `index.css`)
- **Visual Styling Matching Provided Screenshots**:
  - Implemented the rounded pill chat input with inner emoji picker button `(😊)`, outer paperclip attachment button `(📎)`, and circular send button `(✈️)`.
  - Added message hover action toolbar: emoji reaction picker button, reply button `(↩️)`, and more options menu `(•••)`.
  - Added features: Pin/Unpin message with top sticky pinned banner (jump to message), Reply with quote preview banner, Copy Text, Delete/Unsend (for author), and Report (for others).
  - Added full attachment rendering in bubbles: images with lightbox modal (`ChatImagePreview`), videos, and generic files with download buttons.
  - Aligned avatars: teammates on the left, current user messages aligned right with avatar on the outer right edge.
  - Globally hidden arrow buttons on Chromium scrollbars (`*::-webkit-scrollbar-button { display: none !important; }`) and added thin custom scrollbar (`inbox-scroll-thin custom-scrollbar`).

### 2. Project Video Scrubber & Portfolio Clip Configuration (`Profile_Portfolio.tsx`)
- **Interactive Visual Timeline Scrubber**:
  - Replaced basic text inputs with a visual timeline scrubber with draggable start/end handles and a draggable selection window.
  - Added precision `-1s` / `+1s` nudge buttons and a "Reset to Start" button.
  - Built real-time looping preview: automatically plays only the selected timestamp range (`clipStart` to `clipEnd`) and loops.
  - Added "Open in Video Editor ↗" shortcut in the modal header to launch the editor with handoff tokens.
- **Client Duration Ceiling & NDA Enforcement**:
  - Dynamically extracts client portfolio permissions and duration ceilings from order questions/questionnaires (e.g. up to 15s or 30s) and contract milestones.
  - Automatically restricts timeline selection to the client-approved duration ceiling.
  - Strictly disables portfolio addition if the client requested an NDA or private deliverables.
- **Video URL & CloudFront Resolution**:
  - Updated `backend/controllers/ProjectControllers.js` and `backend/.env` to ensure `videoUrl` and `thumbnailUrl` output full CDN URLs (`https://d2dl0agwn9kque.cloudfront.net/...`).
  - Added frontend `resolveMediaUrl` helper in `Profile_Portfolio.tsx` to safely resolve relative storage paths.
  - Enhanced `PROJECT_PORTFOLIO_DETAILS_SQL` in `ProjectRepositories.js` to look for video media assets as well as milestone deliverable submissions in `submit_attachments`.

### 3. Subscription Tier Display Reconciliation (`GigRepositories.js`, `SubscriptionRepositories.js`, `SeedDiscoveryFreelancers.js`)
- Fixed duplicate/conflicting subscription rows where users had both Free and Business rows.
- Ranked active subscription queries by plan tier (`tier_rank: Business = 3, Pro/Premium = 2, Free = 1`) and verified active billing periods.
- Fixed discovery gig and job card badge display to accurately reflect the user's active tier.
- Fixed seed scripts to update existing trigger-created subscription rows instead of creating duplicate records.

### 4. Dynamic Order Question Filtering (`3_order_questions.tsx`, `gig_order_page.tsx`)
- In the gig checkout wizard, dynamically reads the creator's requested portfolio duration (e.g. 30s) and filters duration choices (`[5, 10, 15, 20, 30]`), preventing clients from selecting higher durations than allowed.

---

## Handover & Continuation Notes ("Please continue this like that")
- **Video Editor Package (`video-editor/`)**: Kept strictly untouched per project instructions. All editor interactions happen via handoff tokens and external routes.
- **Video Sourcing in Portfolio Modal**: The modal plays the project's rendered `.mp4` video. When a user creates a new project or submits a milestone, they upload/render the `.mp4` deliverable, which is automatically picked up by `ProjectRepositories.js` via `media_assets` or `submit_attachments`.
- **Timestamp Playback on Profile**: The portfolio displays items via `#t=start,end` on the video player and loops it, ensuring instantaneous playback without requiring server-side re-renders.
- **Clean Architecture**: Preserved controller $\rightarrow$ service $\rightarrow$ repository separation across Express backend and verified with `npm --prefix frontend run build`.

---

## Also in progress: Admin and staff console hosts

### Objective
Serve the admin console at `admin.ensemble.software` and the staff portal at `staff.ensemble.software`, instead of `ensemble.software/admin` and `ensemble.software/staff`. Keep the existing `/admin` and `/staff` route modules. Moderator desks stay on the main site.

### Acceptance Criteria
- [x] `localhost:5173/admin` and `/staff` redirect to `admin.localhost` and `staff.localhost`. On those hosts the address bar omits the prefix.
- [x] `ensemble.software` / `www.ensemble.software` do the same for `admin.ensemble.software` and `staff.ensemble.software`.
- [x] API CORS allows the console origins derived from `FRONTEND_URL`.
- [x] Local console hosts proxy `/api` and `/socket.io` so login cookies stay on that host.
- [x] Admin routes require the Admin role on the client; signed-out visitors land on the portal login.
- [x] Logout and refresh failures clear cookies with matching Secure/SameSite attributes.
- [x] Platform view frames member pages from the console host (same origin, staff session, view-only guard); cross-origin framing renders nothing.
- [x] Verified with a stub API: login, session reload, CSRF rejection/acceptance, logout revocation, CORS allow/deny.
- [ ] DNS and the production web server still need to point both hosts at this frontend, fall back to `index.html`, and send `frame-ancestors 'self'`.
- [ ] Sign in against the real backend once it is safe to run locally.
