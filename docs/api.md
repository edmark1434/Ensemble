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
- `POST /api/accounts/disputes/:id/messages`: the filer may add information while hidden. After staff set `visibility = true`, only the two parties may comment. Guests can read public discussion at `GET /api/accounts/disputes/:id`.

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
- `/api/market-assets/licenses?projectId=...&ids=...` reads project licensing for timeline badges and playback, after verifying current membership. Licensed assets include `imageSources`, keyed by media asset ID, so images download directly from storage without another authorization/redirect round trip. Original paths come only from linked, non-deleted image files under assets with active project licenses. The response is private/no-store and exposes database/signing durations through `Server-Timing`. Image links are signed in 30-second windows, expire 60 seconds after that window starts, and permit private browser caching for 30 seconds. Status refreshes on project/items change, purchase, window focus and periodically for collaborators.
- Playback uses one batch license loader, including nested scenes. Existing licenses are published without waiting for unrelated free-use claims. Only mounted image layers request their bytes; each image is decoded before it appears. A project-scoped cache deduplicates by stable playback source, independent of rotating signed URLs, and releases bytes when a source is removed or the project unmounts. The canvas always stays mounted; videos/audio stream independently. Neither signed URLs nor blob URLs enter project history.
- Editor `/api/market-assets/:id/source?projectId=...&mediaAssetId=...` rechecks original access and current membership (including project viewers/commenters), then returns a non-cacheable 307 redirect to a 60-second signed storage URL. The browser downloads originals directly from storage, including range requests; the editor server never relays media bytes. Video/audio playback and image fallback keep this stable endpoint, so subsequent requests to it recheck access and receive a fresh link. An issued link remains usable until expiry. Export source authorization is described below.

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

### Editor project licensed collections

- `GET /api/market-assets?view=licensed&projectId=...&type=image|video|audio` lists assets with active, non-deleted licenses assigned to the current project. A signed session and active membership in a non-deleted project are required. The collection includes collaborator/free licenses and licensed unpublished listings; it excludes unassigned and other-project licenses. Existing search, bundle pagination and media counts apply.
- Export settings now use a separate asset-payment step when Export project/scene finds unpaid assets. Back restores settings; cancelling checkout returns to the asset step, while completing it returns to settings.
