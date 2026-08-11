# Ensemble Project Knowledge

Read this file before changing the repository. Load only the relevant document under `docs/` for the work being performed, plus `tasks/current-task.md` when it contains an active task.

## Repository map

- `backend/`: Express 5 CommonJS API, PostgreSQL, MongoDB, Redis, Socket.IO, migrations, and background jobs.
- `frontend/`: React 18, TypeScript, Vite, React Router, Zustand/Redux, Axios, and Socket.IO client.
- `video-editor/`: separate editor package; do not change it unless the task explicitly concerns the editor.
- `backend/migrations/`: append-only PostgreSQL migrations managed by `node-pg-migrate`.

## Read by task type

- Architecture or cross-cutting changes: `docs/architecture.md`
- Tables, queries, migrations, or persistence: `docs/database.md`
- Authentication, authorization, secrets, validation, or webhooks: `docs/security.md`
- Controllers, services, repositories, routes, or external APIs: `docs/api.md`
- React, styling, forms, state, or browser behavior: `docs/frontend.md`
- Redis, cached state, reconciliation, or invalidation: `docs/caching.md`

## Working rules

1. Preserve the existing controller → service → repository separation.
2. Keep route handlers thin. Put business rules in services and SQL/database access in repositories.
3. Never edit an already-applied migration; add a new migration with both `up` and `down` behavior.
4. Validate sensitive rules on the backend even when the frontend also validates them.
5. Never expose secrets, OAuth tokens, encryption keys, webhook tokens, or provider credentials to the frontend or logs.
6. Preserve user changes in a dirty worktree and avoid unrelated refactors.
7. Use the existing visual theme. Do not add gradients unless explicitly requested.
8. For realtime features, update durable state first, then broadcast the committed result.

## Verification

- Frontend: `cd frontend && npm run build`
- Backend: no complete automated test command currently exists. Run focused scripts/checks and start the server when safe.
- Database: inspect migration status and test new migrations against a non-production database.

Document the current implementation objective and acceptance criteria in `tasks/current-task.md`; clear or replace it when the task changes.
