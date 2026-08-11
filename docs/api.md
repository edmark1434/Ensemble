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
