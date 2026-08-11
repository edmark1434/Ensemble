# Architecture

## Runtime components

- The frontend is a React/Vite single-page application served separately from the API.
- `backend/Server.js` creates one HTTP server shared by Express and Socket.IO.
- The API is mounted at `/api` through `backend/routes/Api.js` and normally listens on port `4000`.
- The local frontend normally runs on port `5173`; production origins come from environment configuration.
- PostgreSQL stores relational/business data. MongoDB is used by features that need document-oriented storage. Redis supports transient/shared state.
- `backend/lib/BackgroundJob.js` starts reconciliation work after database connections initialize.

## Backend dependency direction

`route → controller → service → repository → database/provider`

- Routes define HTTP method, path, middleware, and controller.
- Controllers translate HTTP input/output and delegate business behavior.
- Services own validation, workflows, idempotency, transactions, notifications, and provider orchestration.
- Repositories own SQL or persistence operations and return data rather than HTTP responses.
- Shared infrastructure belongs under `backend/lib/` or focused middleware.

Do not introduce reverse dependencies, SQL in React/controller files, or Express response objects in repositories.

## Realtime behavior

Socket.IO is initialized once in `backend/lib/WebSocket.js`. Persist authoritative state before emitting. Events should contain stable IDs, timestamps, and enough normalized data for clients to update without guessing. Reconnects must recover state through an API query rather than depending solely on missed events.

## Cross-cutting changes

For features spanning UI, API, persistence, and realtime updates:

1. Define durable state and transitions.
2. Add migration/repository support.
3. Implement service rules and idempotency.
4. Expose a controller/route.
5. Broadcast committed changes.
6. Update frontend state and UI.
7. Verify refresh/reconnect behavior.
