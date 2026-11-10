# Current Task: Workspace Chat Redesign, Portfolio Video Scrubber & Project Duration Enforcement

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
