# Backend Structure

## Controllers

backend/controllers/

- forumGroupControllers.js
- forumDiscussionsControllers.js

Controllers should

- Receive requests
- Validate basic input
- Call services
- Return responses

No business logic.

---

## Services

backend/services/

- forumGroupServices.js
- forumDiscussionsServices.js

Services contain

- Business logic
- Validation
- Authorization
- Notifications
- WebSocket events

---

## Repositories

backend/repositories/

- forumGroupRepositories.js
- forumDiscussionRepositories.js

Repositories only access MongoDB.

No business logic.

---

## Routes

backend/Route/

Main router

api.js

Forum routes

forum.js

All forum endpoints are registered through api.js.

---

## Server

backend/server.js

Express starts here.