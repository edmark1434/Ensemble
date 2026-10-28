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

## Badge requirement library

- `GET /api/admin/badge-requirement-types` lists evaluable metrics (jobs, gigs, assets, profile, reviews, followers). Used when creating a named rule.
- `GET /api/admin/badge-requirement-defs` lists named rules. `POST` creates a custom rule `{ name, description, metric, operator, threshold }`. `PATCH /api/admin/badge-requirement-defs/:defId` updates it. `DELETE` soft-deletes a custom rule that is not attached to a badge. Product (`is_system`) rules can be renamed but not deleted or have their metric/threshold changed.
- Catalog `POST/PATCH /api/admin/badges` attaches rules with `{ requirements: [{ requirementDefId }] }`. Empty list means honorary. Evaluation still pending-grants when every attached rule is met.

## Warning library

- `GET /api/admin/warning-catalog?desk=` lists live named warnings for a desk (admin/support see all). Same payload on `GET /api/moderator/warning-catalog` for restriction-desk staff. Each row includes locked `points`, `meritHit` (points × 2), and `durationDays`.
- Admin CRUD: `GET/POST /api/admin/warning-defs`, `PATCH/DELETE /api/admin/warning-defs/:warningDefId`. Body `{ label, category, points, desks, note }`. Points must be 1–10. Delete is a soft-delete.

## Marketplace license endpoints

- `POST /api/assets/:assetId/purchase` returns `license` alongside the existing purchase response. `alreadyPurchased` means an active unassigned license was reused without another charge. Asset responses include `available_license_count`; `is_purchased` still means the viewer has at least one active purchased license.
- `GET /api/assets/:assetId/licenses?page=1` returns the authenticated buyer's license history, 50 records per page with `hasMore`.
- `POST /api/assets/:assetId/licenses/:licenseId/assign` accepts `{ "projectId": "uuid" }`. Only the buyer can assign their active license, and they must be an Owner, Manager, or Editor of a non-deleted, non-frozen project. Repeating the same assignment succeeds; changing projects or consuming another license for an already-licensed project returns 409.
- Original preview/download routes accept optional `projectId` query context for shared project access. Without that context, existing creator/buyer library access remains available. This is not a render authorization endpoint; editor checkout and clean-export integration are not wired yet.
