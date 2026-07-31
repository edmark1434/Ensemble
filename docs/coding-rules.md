# Code Rules

Before coding

- Search existing implementation.
- Reuse existing functions.
- Extend existing code.
- Do not duplicate logic.

Architecture

Controller
- Request
- Validation
- Service call

Service
- Business logic
- Authorization
- Notifications
- WebSocket

Repository
- Database only

Never violate architecture.

Do not

- Rewrite unrelated files
- Change APIs unnecessarily
- Create duplicate upload helpers
- Create duplicate websocket connections

Always

- Keep functions small
- Follow naming conventions
- Preserve project style
- Reuse utilities