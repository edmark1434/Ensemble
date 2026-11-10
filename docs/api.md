# API

## Structure

- Root API router: `backend/routes/Api.js`
- Feature routes: `backend/routes/*.js`
- HTTP adapters: `backend/controllers/`
- Business workflows: `backend/services/`
- Persistence: `backend/repositories/`
- External/shared infrastructure: `backend/lib/`

## Adding an endpoint

1. Add or reuse repository operations.
2. Implement validation and workflow in a service.
3. Add a thin controller that maps request data and errors to HTTP responses.
4. Register middleware and route under the appropriate feature router.
5. Mount new feature routers in `routes/Api.js` if necessary.
6. Add frontend API access through the existing Axios setup in `frontend/src/lib/api.ts` or the feature's established client.

## Contract guidelines

- Use consistent JSON envelopes within the feature and meaningful HTTP status codes.
- `400`: malformed/invalid input; `401`: unauthenticated; `403`: unauthorized; `404`: absent resource; `409`: state/idempotency conflict; `422`: semantically invalid when established; `500/502`: internal/provider failure.
- Do not pass raw provider errors, SQL errors, or stack traces to clients.
- Normalize dates as ISO 8601 strings and keep status values explicit.
- Pagination responses should include items and sufficient paging metadata.
- Search, status, and date filters must be validated and parameterized.

## Video upload policy

- Editor `GET /api/media-assets/:id/usage` requires ownership of a trashed upload and reconstructs saved/live project and scene documents to list affected locations. Names of projects the uploader no longer belongs to are redacted. Delete forever opens a confirmation dialog and disables confirmation until this check succeeds.
- Editor `POST /api/media-assets/status` requires current project membership and accepts up to 100 source URLs. It reports permanently deleted original uploads, excluding recoverable trash. The editor refreshes on deletion, focus and every ten seconds, showing missing-media placeholders without changing clip timing or saved history. Export submission rejects visible permanently deleted uploads with 422. Delete forever and trash expiry directly delete unshared S3 objects before marking the media record deleted; database metadata remains. No storage-cleanup columns, migration or separate worker are required.

- Main site `GET /api/files/video-upload-policy` and editor `GET /api/uploads/policy` return the signed-in uploader's effective plan, resolution bounds, display label and whether to show the notice. Responses are private/no-store. Editor also returns the main site's upgrade URL.
- New market video originals and editor file/URL video uploads enforce Free 720p, Premium 1080p, Business 2160p during server-side normalization. Bounds rotate for portrait; smaller videos are not upscaled. Business notices are hidden; image originals are unaffected.
- Editor presign/finalize/URL-import endpoints verify the signed editor session matches the upload owner. Finalize/import also require editable project membership. The cap is queried at finalization, never supplied by the client.
- Editor upload controls compare personal media storage against Free 5 GB, Premium 100 GB, or Business 1 TB, including queued and selected transfers. Presign/import reject uploads exceeding capacity; finalization checks actual stored size under a per-owner transaction lock. Only distinct original files belonging to non-deleted media assets count; trashed uploads still count until permanently deleted. Proxies, thumbnails, and project documents are excluded.

## External providers

- Set authentication and idempotency headers server-side.
- Configure timeouts and distinguish provider rejection from temporary transport failure.
- Store the provider reference required for webhook and reconciliation matching.
- Provider callbacks must be publicly reachable HTTPS endpoints in production.

## Realtime API

- Use Socket.IO for timely notification/presence/status updates, not as the sole source of truth.
- Event names and payload shapes must remain stable and scoped to authorized rooms/users.
- Always expose a normal HTTP read endpoint so refresh or reconnect restores current state.

## Badge catalog

- `GET /api/admin/badge-requirement-types` lists evaluable metrics (jobs, gigs, assets, profile, reviews, followers) plus honorary `admin_grant`.
- Catalog `POST/PATCH /api/admin/badges` stores one unlock on the badge: `{ triggerEventCode, conditionValue, badgeCategoryId }`. `category` (name) is still accepted if it matches a live row. `admin_grant` means honorary. Evaluation pending-grants when that one unlock is met.
- `GET /api/admin/badge-categories` lists live categories. `POST /api/admin/badge-categories` creates one (`{ name, description }`). Duplicate live names return 409.
- Badge payloads (`GET /api/admin/badges`, profile `badges`, discovery cards, `GET /api/accounts/badges/mine`) include `badge_category_id` and `category` (the live category name). The badges row stores only the foreign key.

## Platform Merit

- Not stored. Profile `standing.merit` and `GET /api/users/me/standing` `merit` are `clamp(100 − active warning points, 0, 100)`.
- Staff restriction payloads still include `warningPoints`. User-facing payloads should use `merit`.

## Warning library

- `GET /api/admin/warning-catalog?desk=` lists live named warnings for a desk (admin/support see all). Same payload on `GET /api/moderator/warning-catalog` for restriction-desk staff. Each row includes locked `points` and `durationDays`.
- Admin CRUD: `GET/POST /api/admin/warning-defs`, `PATCH/DELETE /api/admin/warning-defs/:warningDefId`. Body `{ label, category, points, durationDays, desks, note }`. Points 1–10. Duration 1–365 days. Delete is a soft-delete. Staff-issued warnings copy points and duration; client-sent clocks are ignored.
- Admin-only thresholds: `GET/POST /api/admin/warning-thresholds`, `PATCH/DELETE /api/admin/warning-thresholds/:thresholdId`. Body `{ minPoints, effect, label, suspendDays, note }`. Effects: `none`, `record`, `limited`, `restricted`, `frozen`, `auto_suspend`. `suspendDays` is required for auto-suspend.

## Standing punishment library

- `GET /api/admin/punishment-catalog?desk=&kind=` lists live named bans, suspensions, and timeouts for a desk. Same payload on `GET /api/moderator/punishment-catalog`. `kind` is `ban`, `suspend`, or `timeout`. `durationDays` is null when the default is permanent.
- Admin CRUD: `GET/POST /api/admin/punishment-defs`, `PATCH/DELETE /api/admin/punishment-defs/:punishmentDefId`. Body `{ label, kind, category, durationDays, permanent, desks, note }`. Duration 1–365 days, or `permanent: true` / `durationDays: null`. Ban rows are limited to admin and support desks. Delete is a soft-delete.
- Staff `PATCH /api/admin/accounts/:accountId/status` and moderator restriction patches require `punishmentId` for ban, suspend, and timeout. Catalog duration is used unless `customDuration: true` with `duration` / `endsAt` / `days`. Reason is still required. Lock and lift actions do not use the catalog.

## Contract disputes

- `POST /api/contracts/:contractId/dispute` creates a hidden Contract dispute, links remaining contract escrow through `related_dispute_id` / `related_credit_transaction_id`, and freezes release/refund until the case is closed.
- `GET /api/users/disputes` lists the filer's cases plus visible cases that name them. `GET /api/users/disputes/:id` returns filer-visible notes (`author_and_staff`) while the case is still hidden.
- Staff dispute PATCH actions (assigned handler): `approve` sets `visibility = true` and opens the case; `hide` / `make_private` sets `visibility = false` again (drops the public page + profile listings; disputee loses access until reopened). Generic patches may also send `visibility: true|false`.
- `action: "resolve"` closes a case with a reason: `outcome` is one of the keys in `backend/lib/DisputeResolutions.js` (`resolved_both_parties`, `disputee_refused`, `disputer_refused`, `disputer_inactive`, `disputee_inactive`, `withdrawn`, `no_violation`) plus optional `resolution_notes`; `disputee_refused`, `disputer_refused` and `no_violation` require a note. It writes `status = closed` + `resolution_outcome` + `resolved_at`, then posts the outcome in the discussion automatically — `public` when the dispute is visible, otherwise `disputer` (a hidden case has no public page, and its `parties` messages are unreadable while `visibility` is false). Parties get a notification naming the outcome. Resolving an already-closed case is a 400; reopening clears `resolution_outcome`. Unlike `dismiss` and `convict`, resolve does **not** force the dispute public. The dispute detail payload carries `resolutionOptions` (key, label, hint, requiresNote) for the Resolve prompt, and `resolutionOutcome` / `resolutionOutcomeLabel` on the dispute.
- Party messages sent through the shared inbox on a dispute chat are stored with `dispute_id` and an audience: `author_and_staff` (private, no notifications) while the case is hidden, `parties` once it is public. Private notes are emitted only to the sender and real staff accounts, never to the chat room. Dispute inbox messages cannot be edited. Viewing internal dispute messages requires a `staff` row, not just an `admin` chat role.
- `GET /api/accounts/disputes/:id` returns the public forum thread for a visible dispute (party + public messages, plus the viewer's own held comments). Guests may read; signed-in viewers get `canComment: true` while the case is open, and `commentsNeedApproval: true` when the viewer is not a party. Profile payloads include `disputes` from `listVisibleAccountDisputes` so both the disputer and disputee profiles list cases with `visibility = true`.
- `POST /api/accounts/disputes/:id/messages`: while hidden, only the filer may add staff-visible notes. Once `visibility = true`, any authenticated member may reply, but **only the two parties post straight to the public thread**. A reply from anyone who is not the disputer or disputee is stored as `author_and_staff` with `pendingReview: true` — visible to its author and staff only, with no party notifications — until a staff member or admin moves it to `public` (or `parties`) via `PATCH .../messages/:messageId`. The assigned handler gets a notification when one is waiting. Closed cases are read-only. Staff reply audiences: `staff` (staff only), `disputer` (staff + filer), `disputee` (staff + respondent), `parties` (both parties), `public`. Handlers can toggle audience on send or via `PATCH .../messages/:messageId`. Message create/publish responses include the saved message (and `chatId` when available) so clients can update without a full reload. Live updates use Socket.IO `disputeMessage` / `disputeMessageUpdated` and `joinDisputeDiscussion` / `leaveDisputeDiscussion` for the public page room `dispute:public:{id}`. Shared inbox previews never expose private dispute text to the wrong party.
- Attachments: `POST .../messages` (member and all five staff routes) accepts `attachments`, up to 4 per message, and the body may be empty when at least one file is attached. Files are uploaded first through the normal presigned flow (`POST /api/files/upload-url` → `POST /api/files/finalize`, folder `chat-attachments`), and only server-issued staging keys under `chat-attachments/` or `ticket-attachments/` are accepted — `normalizeDisputeAttachments` drops anything else, including absolute URLs and traversal. Stored on the Mongo message as `attachments` and returned on every mapped dispute message, so the community, both parties and staff all upload and view images, video and files in the same thread. Attachment-only messages get a generic inbox preview instead of empty text.
- `action: "reopen"` now works like resolve: `reopenReason` is one of `new_evidence`, `appeal_granted`, `party_now_responding`, `staff_error` (the first, second and fourth require `resolution_notes`). It clears `resolution_outcome`, posts the reopen notice in the discussion, and notifies the parties. The detail payload serves the list as `reopenOptions`.
- Decision messages (resolve and reopen) are posted by the platform, not the staff member: `author_type: "system"`, `author_name: "Dispute Resolution"`, `author_role: "resolution"`, and **no `sender_id`**, so no account is attributed to the parties. The acting staff id stays in `recordAccountActivity`. Clients detect these with `isDisputeDecision` and render them as a highlighted ruling card rather than a chat line; replying to one is disabled. Wording and author live in `backend/lib/DisputeResolutions.js` (`DISPUTE_DECISION_AUTHOR`, `buildDisputeResolutionMessage`, `buildDisputeReopenMessage`).
- Audience indicators: party-facing payloads carry `viewerRole` (`disputer` | `disputee` | `community` | `null`) alongside each message's `audience`, so the client can say who else can read it ("Only you and staff", "Both parties and staff", …). A staff reply targeted at `disputer` / `disputee` / `parties` now stays with that audience on the public page — it is no longer shown to everyone — so those labels are truthful.
- Threaded replies: `POST .../messages` (member and staff routes) accepts `replyToId`, stored as Mongo `message_id_reply` and returned as `replyToId` on every mapped dispute message. The parent must live on the same dispute chat and be a message the author is allowed to see, so nobody can quote a message they were never shown (400 when missing, 403 when hidden). A member reply that quotes a message which is not `parties` / `public` is itself held as `author_and_staff`, so a quote can never pull private text into the public thread. Clients resolve the quoted body from messages they already hold; a parent the viewer cannot see renders as a neutral placeholder.
- Staff money actions (Admin or assigned Support with `canAct`): `POST /api/admin/disputes/:id/financial-resolution` and `POST /api/moderator/support/disputes/:id/financial-resolution`.
  - `action: "settle_escrow"` with `clientCredits`, `freelancerCredits`, `resolutionNotes` (min 8 chars). Splits remaining frozen escrow; auto-closes the dispute.
  - `action: "reverse_transaction"` with `creditTransactionId`, optional `amount`, `resolutionNotes`. Reverses a linked completed transaction; fails with 409 if the destination wallet lacks balance; auto-closes the dispute.
  - A dispute accepts only one financial resolution. Non-handlers receive 403.

## Member reports

- Member report POSTs (`/api/jobs/:jobId/report`, `/api/gigs/:id/report`, `/api/assets/:assetId/report`, `/api/accounts/:accountId/report`, `/api/inbox/message/:messageId/report`, `/api/forum/reports/...`, `/api/teams/:teamId/reports`, `/api/team-projects/:id/report`) store `subject_snapshot` on `reports`: `{ kind, title, body, href, extra }`. `description` is the reporter's reason text only.
- Staff `GET /api/admin/reports/:id` and the matching moderator report detail routes return `subject` with `headline`, `preview`, `available`, `linkable`, `links`, and (for chat) `message`. `links` are member-site paths; staff consoles wrap them in platform-view. Inbox messages are not linkable, so the snapshot body is shown instead. Deleted jobs, gigs, assets, discussions, groups, and teams keep the snapshot and drop the dead Open link.

## Marketplace license endpoints

- `POST /api/assets/:assetId/purchase` returns `license` alongside the existing purchase response. `alreadyPurchased` means an active unassigned license was reused without another charge. Asset responses include `available_license_count`; `is_purchased` still means the viewer has at least one active purchased license.
- `GET /api/assets/:assetId/licenses?page=1` returns the authenticated buyer's license history, 50 records per page with `hasMore`.
- `POST /api/assets/:assetId/licenses/:licenseId/assign` accepts `{ "projectId": "uuid" }`. Only the buyer can assign their active license, and they must be an Owner, Manager, or Editor of a non-deleted, non-frozen project. Repeating the same assignment succeeds; changing projects or consuming another license for an already-licensed project returns 409.
- Original preview/download routes accept optional `projectId` query context for shared project access. Without that context, existing creator/buyer library access remains available. Render source authorization uses the internal `render-source` action described below.

### Editor asset checkout

- Editor `/api/market-assets/:id/purchase` GET loads the asset, current wallet balance, available unassigned license and current project license. POST requires the current project, confirmed asset price and confirmed charge. It reuses an available license or purchases and assigns one atomically. Another collaborator/retry finding the project already licensed returns without charging again.
- Both editor routes verify the signed editor session and forward its account identity through the existing internal-secret bridge. Browser POST requests require matching Origin. Editable project membership and frozen-project rules are enforced on the backend.
- `/api/market-assets/licenses?projectId=...&ids=...` reads project licensing for timeline badges and playback, after verifying current membership. Licensed assets include `imageSources`, keyed by media asset ID, so images download directly from storage without another authorization/redirect round trip. Original paths come only from linked, non-deleted image files under assets with active project licenses. The response is private/no-store and exposes database/signing durations through `Server-Timing`. With protected CloudFront enabled, original image/video/audio playback uses exact-file CloudFront grants lasting 55–60 minutes. Signed S3 remains the fallback only when CloudFront is disabled or a legacy key is outside its protected asset-originals/ path; legacy S3 images retain their 30–60-second grants. Status refreshes on project/items change, purchase, window focus and periodically for collaborators.
- Playback uses one batch license loader, including nested scenes. Existing licenses are published without waiting for unrelated free-use claims. Only mounted image layers request their bytes; each image is decoded before it appears. A project-scoped cache deduplicates by stable playback source, independent of rotating signed URLs, and releases bytes when a source is removed or the project unmounts. The canvas always stays mounted; videos/audio stream independently. Neither signed URLs nor blob URLs enter project history.
- Editor `/api/market-assets/:id/source?projectId=...&mediaAssetId=...` validates the signed editor session, project membership, active project license and exact asset/media linkage through the same repository and signing service as the batch endpoint. It returns a private/no-store 307 redirect using the same CloudFront-first delivery policy. A failed CloudFront signing attempt for a protected original fails closed rather than falling through to an S3 redirect. The browser downloads bytes directly from the CDN; the editor server does not relay them. Issued grants remain usable until expiry. Export source authorization is described below.

- Creator ownership is returned separately from project `licensed` status. For paid assets, merely reading/selecting an asset never grants a project license or unlocks editor originals. Explicit creator checkout with a confirmed zero charge grants a project license without a ledger transaction or wallet changes. Project-context original previews require that project license, including for the creator; standalone creator library access is unchanged.

- Editor `POST /api/market-assets/:id/use-free` runs for free assets present in a project, including drops and nested scenes. It verifies the signed session, editable membership, non-frozen project and published asset, then checks the current zero price under lock and saves a zero-cost project license without a payment or wallet mutation. Existing project licenses are reused even after a price increase. Paid creator assets still require explicit owner-discount checkout; client snapshot prices never authorize free use.
- Free project licenses share the purchased-license access checks, retaining clean editor playback for collaborators after listing price increases. Free items have no timeline price badge or canvas purchase control. Free project licenses also authorize clean export sources.

### Export assets and draft flow

- The export dropdown inspects visible IDs in the current project or scene, including one embedded scene-content layer as the renderer does. It excludes hidden/orphaned items and counts each marketplace listing/bundle once. License status is refreshed before presenting the export action.
- Unlicensed paid assets show primary Pay for assets in the project/scene and outline Get watermarked draft actions. The purchase modal quotes all distinct assets, displays owner discounts/available licenses and the total, and requires explicit confirmation. Each checkout retains the existing server-side price/charge guards and idempotency. If a later checkout fails, committed licenses remain and the modal re-quotes the remaining balance before another confirmation; the overall batch is not one atomic transaction.
- Editor export requests carry projectId and an explicit marketDraft flag. The signed editor session supplies the render identity (including status/cancellation requests); client identity headers are not trusted. Internal render-source checks membership and the actual project license for every market media file. Licensed media uses protected originals; unlicensed media is rejected for clean export and uses a validated generated proxy only for explicit drafts. Export never makes a purchase.
- Render source URLs expire after 24 hours to allow queueing and are inserted only into the render job copy, never project history. The render server progress endpoints return only format/type/project name from job input and redact raw error details; they do not expose source URLs. Existing 60-second preview/download URL expiry is unchanged.

## Support tickets

- Members file their own tickets with `POST /api/users/tickets`. The requester is always the signed-in account. `fields` holds that type's answers. A project, listing, order, contract, or job picker sends the record id; the server stores the name beside it and rejects an id the account does not own. `context` (`browser`, `device`, `page`) is stored with the account snapshot on the ticket. Ticket detail returns `formValues` and `submissionContext` separately.
- Staff open a ticket for someone with `POST /api/staff/tickets`. Admin can use the same body on `POST /api/admin/tickets`. Body: `{ requesterAccountId, subject, type, description, priority?, assignToMe? }`. `requesterAccountId` is required and must be a live member or staff account. Description is stored as the opening staff message. `assignToMe` only succeeds when that staff role can handle the ticket type; otherwise the ticket stays unassigned in the type's queue.
- Staff search accounts with `GET /api/staff/tickets/people?q=`.

### Editor sharing and template handoff

- Public `GET /api/assets/:assetId/template-preview` returns saved-snapshot dimensions, duration, and an encrypted preview token for the current published template. The token is bound to that asset and snapshot; the editor rechecks that the same listing remains published before rendering a sanitized, watermarked preview.
- `GET /api/assets/:assetId/template-use` prepares a template-use quote (current price, actual charge after any available license/creator discount, and whether the captured content contains paid marketplace assets). `POST` takes `projectId` as a retry key plus `expectedPrice` and `expectedCharge`. It always creates a new project, or returns the already-created project for that same authenticated buyer and template; it never overwrites an existing project. Project/scenes, owner memberships, upload references, license assignment and payment commit in the existing checkout transaction. No migration is required.
- Template purchase uses the regular purchase endpoint and leaves the license unassigned. The resulting Use in a project CTA opens a separate confirmation explaining the new project and permanent license assignment. Opening it makes no preparation or wallet requests. The paid-assets tip is an inline details-page card, alongside the existing earnings and used-license notices. Project-creation troubleshooting is deferred at the user's request.
- The backend calls the editor's secret-authenticated `/api/internal/templates/prepare` endpoint to decode the saved template and scene snapshots at capture time. Copies get fresh scene IDs and documents without source collaboration history, members or licenses. Marketplace references remain intact and sources reset to generated watermarked proxies. Included uploaded media gets separate media records referencing the same files so storage cleanup preserves purchased copies.

- Editor `POST /api/projects/:id/share-link` accepts `{ role }` for Owner/Manager callers (only owners may grant Manager). It returns a main-site `/projects/open/:id?share=...` URL. Tokens expire after 30 days and use a purpose-specific derived signing key. After platform login/handoff, the editor verifies the token and current issuer role/membership before adding access. Existing members are promoted only when the signed role outranks their current role; lower-access links never demote them or alter Owner access. Promotions update the existing membership role without resetting joined_at, and the Share modal reflects that stored role. Token expiry does not undo redeemed membership; a still-valid link can promote a manually demoted member again. Changes commit before realtime access refreshes. No separate link-access storage or schema change is used.
- Editor `POST /api/projects/:id/template-snapshot` accepts the current Yjs document as an octet-stream, with `blockId` when editing a scene. It requires Owner/Manager access, rejects frozen projects, and checks scene editing permission. It compacts persisted/live project and scene state with current local edits and returns an Asset Library URL carrying the saved snapshot ID and project name.
- Template listing creation/replacement verifies that the snapshot belongs to a non-deleted project the asset owner currently owns/manages. Existing account eligibility, showcase uploads, listing moderation and snapshot reuse checks still apply; no new database columns are needed.
- `/preview/snapshots/:reference` accepts an authenticated-encrypted reference issued when sharing a template, plus the existing editor handoff token. Numeric snapshot paths are rejected. The reference hides the snapshot ID, is bound to its issuing user, and expires after 30 days; current Owner/Manager access to the source project is still required. No database mapping or schema change is used. It reads only the selected snapshot, resolves scene snapshots at its capture time, and prepares media using existing project license authorization. The snapshot route renders the existing Editor in Viewer mode, with local snapshot/scene hydration and the same editor UI. It does not create a project or editing session, connect collaboration/comments sockets, or attach persistence; project-specific presence, purchase and export handlers are not mounted.

### Licensed collections and export settings

- `GET /api/market-assets?view=licensed&projectId=...&type=image|video|audio` lists assets with active, non-deleted licenses assigned to the current project. A signed session and active membership in a non-deleted project are required. The collection includes collaborator/free licenses and licensed unpublished listings; it excludes unassigned and other-project licenses. Existing search, bundle pagination and media counts apply.
- Export settings now use a separate asset-payment step when Export project/scene finds unpaid assets. Back restores settings; cancelling checkout returns to the asset step, while completing it returns to settings.
- Export dropdowns gate FPS at 30 for Free and 60 for Premium/Business, matching authenticated render-tier limits. MP4/MKV target bitrate is capped in the UI, download state and editor export endpoint at five times the existing resolution/FPS/aspect-ratio recommendation, up to 96,000 kbps. The endpoint validates finite positive dimensions/FPS/resolution and a numeric bitrate before preparing marketplace sources; audio, GIF and ProRes retain their existing handling.
