# Ensemble Project Context

## Project

Ensemble is a community platform for creatives.

The platform contains multiple modules including:

- Forums
- Chat System
- Video Calls
- Job Marketplace
- Gig Marketplace
- Asset Marketplace
- User Profiles
- Notifications
- Payments
- Subscriptions

Current development is focused ONLY on the Forums module.

---

## Tech Stack

### Frontend

- React
- TypeScript
- TailwindCSS

### Backend

- Express.js
- MongoDB
- PostgreSQL
- AWS S3
- WebSocket

---

## Backend Architecture

The backend follows this structure:

```
HTTP Request
    ↓
Route
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

Responsibilities:

- **Routes** register API endpoints.
- **Controllers** receive HTTP requests and return responses.
- **Services** contain business logic.
- **Repositories** interact directly with the database.

Business logic belongs only in Services.

Repositories should only perform database operations.

Controllers should remain thin.

---

## Routing

All API endpoints are registered inside:

```
backend/Route/
```

Main router:

```
backend/Route/api.js
```

Feature-specific routes are separated into their own files.

Example:

```
backend/Route/forum.js
```

To add a new endpoint:

1. Create or update the route inside the appropriate feature route file (e.g. `forum.js`).
2. Register the route in `api.js` if it is a new feature router.
3. Route → Controller → Service → Repository.

Do not place business logic inside route files.

---

## Current Goal

The goal is to make the Forums module behave similarly to Reddit.

Current priorities:

- Fix bugs
- Complete missing features
- Preserve existing architecture
- Keep WebSocket functionality working
- Keep Notifications working
- Make the smallest possible changes

When implementing new features, always search for existing controllers, services, repositories, and utilities before creating new code.