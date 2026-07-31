# API Rules

Reuse existing inbox endpoints.

Do not duplicate APIs.

Controllers

Receive request.

Call services.

Return response.

Services

Validate.

Authorize.

Notify.

Broadcast websocket events.

Repositories

MongoDB only.

No business logic.

Notifications

Created inside Services.

Never inside Repository.