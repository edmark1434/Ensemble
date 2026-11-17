# Ensemble Platform Feature Map

**Purpose:** Ground alpha-testing survey design in real product surfaces found in the codebase (docs, frontend routes, backend APIs, `video-editor/`).  
**Repo root:** `/home/joehanes/Documents/Programming_Stuff/Ensemble/Ensemble`  
**Sources:** `README.md`, `AGENTS.md`, `docs/{architecture,frontend,api,database}.md`, `tasks/current-task.md`, `frontend/src/App.tsx`, `backend/routes/*`, `video-editor/src/app/**`  
**Date mapped:** 2026-11-16

---

## Product overview (from docs/README)

Ensemble is a collaborative creative platform: React/Vite member site + Express API (Postgres, Redis, Socket.IO; MongoDB for forums/disputes chat) + optional Next.js DesignCombo-based video editor (`video-editor/`, default `localhost:3000`). Same frontend build also serves admin (`admin.ensemble.software`) and staff (`staff.ensemble.software`) consoles.

Credits power marketplace purchases, job/gig posting fees, escrow, and subscriptions (Free / Premium / Business plan features).

---

## Cross-cutting feedback, survey, ratings & analytics (product-wide)

These systems already exist and are **not** feature-specific NPS surveys for alpha. Useful context when designing the new instrument.

| Mechanism | Member surface | API / storage | Notes |
|-----------|----------------|---------------|-------|
| **Onboarding survey** | `/setup/survey` (`frontend/src/pages/setup_account/04_Survey.tsx`) | `GET/POST /api/surveys` (`Survey.js`); name e.g. “User Onboarding Survey” | Required onboarding step: how they found Ensemble, employment, purpose (earn/hire/explore). Not NPS. |
| **Platform feedback center** | `/landing/SendAFeedback` | `POST /api/feedbacks`, `GET/PUT /api/feedbacks/rating` → `platform_feedbacks`, `platform_ratings` (1–5 global rating + free-text suggestion) | Tabs: rating vs suggestion. Works in maintenance mode for some paths. |
| **Admin Feedback desk** | `/admin/analytics?tab=feedback` (legacy `/admin/feedbacks`) | `GET /api/admin/feedbacks` | Staff view of suggestions & ratings. |
| **Platform analytics** | `/admin/analytics` | `GET /api/admin/analytics-overview` | Tabs: overview, growth, community, economy, finance, health, feedback. Includes ticket satisfaction metrics. |
| **Support ticket satisfaction** | Inbox ticket UI | `POST /api/users/tickets/:id/satisfaction` → `tickets.satisfaction_score` | 1–5 after ticket close; shown on mod dashboards as avg satisfaction. |
| **Contract / peer ratings** | `/dashboard` rate/review flows, team project completion | `POST /api/dashboard/contract/:contractId/review` → `ratings` (`stars_out_of_five`, `feedback`) | Mutual closeout ratings between client & freelancer. |
| **Asset reviews** | `/assets/:assetId` | `POST/PATCH/DELETE /api/assets/:assetId/reviews` → `asset_reviews` | Buyer reviews of marketplace listings. |
| **Team reviews** | Team detail | `POST /api/teams/:teamId/reviews` → `team_reviews` | 1–5 team reviews. |
| **Editor “comment feedback”** | In-editor comments (not product survey) | WebSocket + comment APIs | Docs call this notification/UX feedback for mentions/replies—not NPS. |
| **Firebase Measurement ID** | `frontend/src/pages/firebase.tsx` config | `VITE_FIREBASE_MEASUREMENT_ID` | Config present; no clear first-party product-analytics event layer found beyond Firebase Auth setup. |
| **Dev seed ratings** | — | `POST /api/accounts/dev/add-rating` (non-production) | Test helper only. |

**No dedicated in-product NPS / SUS / alpha questionnaire** was found beyond onboarding + global 1–5 platform rating + ticket/contract/asset/team star systems.

---

## 1. Cloud Real-Time Collaborative Video Editor

### Frontend (main app)

| Path | Component / role |
|------|------------------|
| `/projects`, `/projects/personal`, `/projects/shared`, `/projects/team`, `/projects/trash` | `pages/user/2_projects/Projects.tsx` — list, rename, trash/restore, open editor |
| `/projects/select` | `Projects_Selection.tsx` — create/new project handoff |
| `/projects/open/:projectId` | `OpenInEditor.tsx` — share-link redeem + redirect to editor with handoff token |

Key helper: `GET /api/editor/handoff-token` then open `VITE_EDITOR_URL` (default `http://localhost:3000`) at `/editor/:id` or `/editor/new`.

### Video editor package (`video-editor/`)

| Path | Role |
|------|------|
| `/editor/[id]` | Main collaborative editor UI |
| `/preview/[id]` | Template / watermarked preview (Viewer mode) |
| `/auth-error` | Session failure |
| Root `/` | Redirects to main app (`MAIN_APP_URL`) |

**Notable editor API surfaces** (`video-editor/src/app/api/`):

- Collab: `/api/collab/projects|blocks|sessions/*` (Yjs-style updates, snapshots, compact)
- Projects/members/share: `/api/projects/[id]`, `members`, `share-link`, `template-snapshot`
- Uploads/policy/storage: `/api/uploads/*`, `/api/media-assets/*`
- Marketplace in-editor: `/api/market-assets/*` (purchase, use-free, licenses, source, thumbnail)
- Render/export: `/api/render/*`
- Comments: `/api/comments/[kind]/[id]`
- Stock/helpers: Pexels, Google fonts, voices, transcribe, audio/music

### Backend (main API) related

- `backend/routes/Project.js` — list/rename/delete/restore/share invitation
- `backend/routes/Editor.js` — handoff token only
- Docs cover collaborative project plan caps, trash, upload normalization, export branding/watermarks, market license assignment, render-source authorization (`docs/api.md`, `docs/architecture.md`)

### Core tester flows

1. Create personal project → open in editor via handoff.
2. Invite collaborator (share link / members) → join via `/projects/open/:id?share=...`.
3. Upload media (plan resolution + storage caps) → edit timeline → comments/mentions.
4. Browse/purchase/license market assets inside editor; free-use vs paid checkout.
5. Export clean vs watermarked draft; plan resolution/FPS limits; branding overlay rules.
6. Publish template snapshot → Asset Library listing → preview `/preview/:id` → Use template (new project).
7. Trash / restore / permanent delete project; missing-media placeholders when uploads deleted forever.

### Gaps / alpha feel

- Editor is a **separate Next.js app**; local setup needs FFmpeg, optional Combo/render secrets, Pexels key.
- Render server / Lambda bundle + watermark patch (`tasks/render-server-ensemble-watermark.patch`) are external operational deps.
- Docs note **template project-creation troubleshooting deferred**.
- Collaborative limits and many plan gates can feel opaque without Credits/Subscriptions context (`/credits-subscriptions`).
- Comment notification read-state is **browser-local only** (not cross-device).

---

## 2. Job & Gigs Marketplace

Two related marketplaces under Jobs and Gigs, plus Discovery for talent/teams.

### Frontend routes

**Jobs**

| Path | Page |
|------|------|
| `/jobs` → `/jobs/postings` | Browse postings |
| `/jobs/postings/:id`, `/jobs/:id/page`, `/jobs/postings/:id/page` | Detail / full page |
| `/jobs/create`, `/jobs/create/team` | Create job (personal or team) |
| `/jobs/edit/:id` | Edit |
| `/jobs/applied`, `/jobs/saved-posts`, `/jobs/my-job-post` (+ `/:id`) | Applicant / saved / owned lists |
| `/jobs/info` | Info guide |
| `/jobs/proposals/*` | Incoming/sent proposals, flow guide |
| `/jobs/:id/make-proposal`, `/jobs/proposals/edit/:proposalId`, detail views | Proposal create/edit/view |
| `/jobs/proposals/.../offer/:contractId` | Offer linkage |

**Gigs**

| Path | Page |
|------|------|
| `/gigs` → `/gigs/services` | Browse services |
| `/gigs/create`, `/gigs/edit/:id`, `/gigs/services/:id/page`, `/gigs/services/:id/order` | CRUD + order |
| `/gigs/my-orders`, `/gigs/saved-services`, `/gigs/my-services` | Lists |
| `/gigs/orders/*` | Incoming/sent orders, flow guide |
| `/orders`, `/my-orders` | **`SectionPlaceholder` — under construction** (legacy stubs) |

**Discovery (adjacent)**

| Path | Page |
|------|------|
| `/discovery`, `/discovery/:tab` | Talent/teams discovery ranking (`14_discovery/`) |

**Moderation**

- `/moderator/jobs/*` — Jobs & Gigs Control, tickets, reports, disputes
- Admin Management embeds shared Jobs Control desk

### Backend

- `backend/routes/Job.js` — CRUD jobs, save, report, invite, proposals (create/status/withdraw), extend/expire window
- `backend/routes/Gig.js` — CRUD gigs, save, report, order lifecycle (submit/edit/withdraw/accept/reject/shortlist/confirm-contract)
- Contract handoff: `POST /api/contracts/job-offer`, accept/reject (see §6)
- Staff: `/api/moderator/jobs/*`, `/api/admin/moderation/jobs/*`

### Core tester flows

**Jobs:** create posting (credits fee) → browse/save/report → submit proposal → client review/shortlist → job offer → contract/escrow.  
**Gigs:** create service → order → seller accept/reject/shortlist → confirm contract → delivery via dashboard.  
**Team-posted jobs/gigs** via team marketplace actors.  
**Moderator:** pause/close/archive postings with reason; report cases.

### Gaps / alpha feel

- Legacy `/orders` and `/my-orders` still show **under construction** placeholders (real flows live under `/gigs/orders`).
- Posting requires verification/credits; complex multi-step create wizards.
- Heavy moderator tooling suggests production-minded compliance, but member UX guides (`/jobs/info`, `/gigs/info`, flow pages) imply learning curve for alpha testers.

---

## 3. Community Forums

### Frontend

| Path | Component |
|------|-----------|
| `/forums` | `pages/user/4_forums/Forums.tsx` — feed + groups |
| `/forums/group/:id` | `SelectedGroup.tsx` — roster, discussions, permissions |
| `/forums/discussion/:postId` | `ExpandDiscussion.tsx` — thread + comments |

Modals: create/edit/delete group & discussion, report group/member/discussion, leave, ban/remove, roles. Realtime helpers: `forumRealtime.ts`.

**Staff:** `/moderator/forum/forum-control` (Discussions | Groups), tickets, reports, disputes; admin Forum Moderation desk shares `ForumModerationDesk`.

### Backend

- `backend/routes/Forum.js` — groups CRUD, members/roles/bans, discussions feed/CRUD, comments, reports
- Persistence: **MongoDB** for forum content (moderator repos use `getMongoClient`); README: server starts without Mongo but **“forums need Mongo later”**
- Moderation: `/api/moderator/forum/*`, `/api/admin/moderation/forum/*` (`ForumContentModerationServices`)

### Core tester flows

1. Create public/private group → invite/join → role management.
2. Post discussion → comment/edit → save discussions.
3. Report group/member/discussion → staff lock/pin/remove/restore.
4. Realtime updates on feed/group (Socket.IO).

### Gaps / alpha feel

- **MongoDB optional at boot** — forums/dispute discussion chat degrade without it.
- Public dispute community thread (`/disputes/:id`) overlaps “community” but is dispute-scoped, not general forums.

---

## 4. Asset Marketplace / Asset Library

### Frontend

| Path | Component |
|------|-----------|
| `/assets`, `/assets/owned`, `/assets/purchased`, `/assets/saved`, `/assets/liked` | `AssetsLibrary.tsx` |
| `/assets/:assetId` | `AssetDetails.tsx` — purchase, reviews, comments, licenses, template use |
| Create/edit UI | `AssetEditorModal.tsx`, upload store, posting eligibility |

**Staff:** `/moderator/marketplace/*` — listing approvals, file inspector (watermarked vs original), tickets, reports.

### Backend

- `backend/routes/Asset.js` — list/get/create/update/delete; like/save; purchase; licenses + assign; reviews; comments/replies; template-preview/template-use; original preview/download; report; internal editor actions
- Media processing: `media_asset_jobs` (proxies/thumbnails); listings stay draft until previews finish (`docs/architecture.md`)
- Editor bridge: market-assets purchase/license/source/use-free (documented in `docs/api.md`)

### Core tester flows

1. Check posting eligibility → upload content/showcase → submit listing → wait for media processing → moderation approval.
2. Browse library filters → like/save → purchase with credits → download original → leave review/comment.
3. Assign license to a video project; use template → new project from snapshot.
4. In-editor purchase / free-use / watermarked draft export without license.
5. Staff: approve/reject/delist/require re-approval; inspect originals via signed URLs.

### Gaps / alpha feel

- Media processing latency and draft-until-ready state can feel unfinished if worker not running (`MEDIA_WORKER_EMBEDDED` / `npm run media:worker`).
- Template “project-creation troubleshooting” deferred (docs).
- Copyright/duplicate signals and complex license rules increase support load for alpha users.

---

## 5. Team Management

### Frontend

| Path | Component |
|------|-----------|
| `/teams` | `Teams.tsx` — general (non-contractual) teams |
| `/teams/:id` | `SelectedTeam.tsx` — tabs: about, members, requests, taskboard, video projects, wallet/transactions, marketplace posts, etc. |
| `/teams/join/:joinCode`, `/teams/invite/:joinCode` | `TeamInvitePage.tsx` |
| `/teams/:id/business-verification` | `BusinessVerification.tsx` |
| `/teams/:id/tasks/:contractId` | `TeamTaskWorkspace.tsx` — contract-scoped team task workspace |
| `/discovery` (teams tab) | Discover public teams |

Related: `InviteTeamModal`, `TeamTaskboard`, `TeamVideoProjectsTab`, admin `/admin/user-team?tab=teams`.

### Backend

- `backend/routes/Teams.js` — list/create/detail; join/leave/invite/approve/deny; roles/suspend/remove; transfer ownership; tasks; video-projects; wallet/funds/distributions; reviews; reports; marketplace-posts; **task-workspaces** under contracts; creation-eligibility / member-limit
- Plan-gated team creation count (Free often 1 owned team)

### Core tester flows

1. Create team (eligibility/plan) → set visibility → share join code/link.
2. Join request / invite accept → role changes (Owner, Representative, Admin, Manager, Member).
3. Team taskboard CRUD; link/create team video projects → open editor.
4. Team wallet: add funds, distribute; marketplace posts as team actor.
5. Business verification submission → badge / Discovery boost.
6. Review team; report team; leave/transfer ownership.

### Gaps / alpha feel

- **General Teams vs Workspaces** distinction is documented in UI FAQs but easy to confuse for testers.
- Member limits and verification gates (`ACCOUNT_VERIFICATION_REQUIRED`) block join/create for unverified accounts.
- Rich permission matrix (wallet visibility, manage members) needs clear role scripts in alpha tests.

---

## 6. Contracts and Workspaces

### Conceptual split (from product UI)

- **Contracts:** Escrow-backed job/gig agreements, milestones, disputes, ratings.
- **Workspaces:** Temporary contractual project rooms auto-created when a job/gig order is funded; listed at `/workspaces`. Distinct from standing General Teams.
- **Team projects:** `/team-project/:id` workspace UI for funded team-delivered work (taskboard, video, submissions, chat, contract/members, history).

### Frontend

| Path | Component |
|------|-----------|
| `/contracts` | `contracts/contracts.tsx` — list |
| `/contracts/:id` | `ContractDetailsPage.tsx` |
| `/contracts/dispute-form`, `/contracts/disputes` | Dispute file + member dispute list |
| `/disputes/:id` | Public/community dispute page |
| `/workspaces` | `Workspaces.tsx` — active / review / archived contractual teams |
| `/team-project/:id` | `TeamProjectWorkspace.tsx` |
| `/teams/:id/tasks/:contractId` | Team task workspace |
| `/dashboard`, `/dashboard/tasks`, `/dashboard/review`, `/dashboard/rate`, `/dashboard/archived`, `/dashboard/flow`, detail routes | Milestone submit/review/rate (`8_dashboard/`) |
| `/terms-of-services` | ToS acceptance flows |

### Backend

- `backend/routes/Contract.js` — list; job-offer; accept/reject; dispute; extend; cancel + cancellation-request; contract team subcontractors; distribute-funds
- `backend/routes/Milestone.js` — cancel/extend/approve/revision under `/api/contracts/:contractId/milestones`
- `backend/routes/Dashboard.js` — tasks, milestone submit/review/buy-revision, contract review
- `backend/routes/TeamProject.js` — project detail/update/delete; taskboard; contracts/milestones/history/members; subcontract proposals; report; chat; video-projects link/create
- Teams task-workspaces APIs (see Teams.js)
- Disputes: deep staff financial resolution flow (`docs/api.md` Contract disputes section); Mongo for dispute chat messages

### Core tester flows

1. Accept job offer / confirm gig order → contract funded in escrow.
2. Workspace appears in `/workspaces` / team-project → assign tasks, link video projects, chat.
3. Freelancer submits milestone → client approve / request revision / buy revision → release.
4. Extend deadline; cancellation request/respond; subcontractors + fund distribution.
5. Complete → mutual rate/review on dashboard.
6. File dispute → staff visibility/resolve/settle escrow; public dispute comments when visible.
7. Deactivation blocked while live contracts/open disputes exist.

### Gaps / alpha feel

- Dispute system is **very mature/complex** (party swap, financial settle, audiences)—alpha testers may need scripted scenarios, not free exploration.
- Workspaces auto-lifecycle (active → review → archived) depends on contract phase; empty `/workspaces` if no funded contracts.
- Mongo required for rich dispute messaging; without it, dispute chat paths fail closed in places (e.g. party swap refuses if Mongo down).

---

## Staff / ops surfaces (for awareness, not primary alpha member survey)

| Portal | Paths | Relevance |
|--------|-------|-----------|
| Admin | `/admin/dashboard`, `user-team`, `credit-economy`, `moderation`, `analytics`, `ticket-management`, `system-settings`, `platform-view` | Feedback & analytics home; badges/warnings policy |
| Staff hub | `/staff/dashboard` | Entry to mod roles |
| Forum / Marketplace / Jobs / Support mods | `/moderator/{forum\|marketplace\|jobs\|support}/*` | Content & marketplace QA for alpha ops |

Seeded staff roles (README): Support, Marketplace, Jobs N Gigs, Forum moderators + Admin.

---

## Suggested alpha test coverage matrix (quick)

| Area | Must-exercise | Optional / advanced |
|------|---------------|---------------------|
| Editor | Create, collab invite, upload, export draft | Template publish, market checkout in-editor, trash |
| Jobs & Gigs | Post + propose/order + accept path | Team posting, moderator pause, Discovery hire |
| Forums | Group + discussion + comment | Roles/bans, reports, staff lock |
| Assets | List → purchase → download/review | Template use, license assign, staff approval |
| Teams | Create, invite, taskboard | Business verification, wallet distribute |
| Contracts/Workspaces | Funded contract → milestone → rate | Dispute file, cancellation, subcontract |

---

## Notable unfinished / alpha signals (summary)

1. `/orders` and `/my-orders` → **SectionPlaceholder** (“under construction”); real gig order UIs are under `/gigs/orders`.
2. Forums (and dispute chat) depend on **MongoDB** even though API boots without it.
3. Video editor + render pipeline are **multi-service** (FFmpeg, optional Combo keys, render server patch).
4. Template project-creation troubleshooting **explicitly deferred** in API docs.
5. Media asset listings wait on background preview jobs—alpha needs worker configured.
6. No first-class **NPS/SUS/alpha survey product** yet; only onboarding survey, global 1–5 platform rating, ticket CSAT, and peer/asset/team stars—aligned with current task to design a new statistics-ready alpha questionnaire.

---

## Key file index

| Concern | Paths |
|---------|--------|
| Route table | `frontend/src/App.tsx` |
| API mount | `backend/routes/Api.js` |
| Architecture | `docs/architecture.md` |
| Frontend conventions | `docs/frontend.md` |
| API behaviors | `docs/api.md` |
| Active task | `tasks/current-task.md` |
| Editor package | `video-editor/` |
| Platform feedback UI | `frontend/src/pages/landing/pages/page_SendAFeedback.tsx` |
| Feedback API | `backend/routes/Feedback.js`, `backend/controllers/FeedbackControllers.js` |
