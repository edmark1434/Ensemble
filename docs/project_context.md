# Ensemble Project Context

## Project

Ensemble is a community platform.

Current focus:
- Chat System
- Forums

Tech Stack

Frontend
- React
- TypeScript
- TailwindCSS

Backend
- Express.js
- MongoDB
- PostgreSQL
- AWS S3
- WebSocket

---

## Backend Architecture

Route
→ Controller
→ Service
→ Repository
→ Database

Controller
- Validate request
- Call service
- Return response

Service
- Business logic
- Authorization
- Notifications
- WebSocket events

Repository
- Database only
- No business logic

---

MongoDB

Used for

- Chat
- Forums

PostgreSQL

Used for

- Accounts
- Notifications
- Payments
- Subscriptions

---

Reuse existing implementation whenever possible.

Make the smallest possible code changes.

Never rewrite unrelated code.