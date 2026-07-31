# WebSocket Rules

Location

backend/lib/websocket.js

Realtime Features

- send message
- receive message
- reactions
- replies
- pin
- typing
- video call
- notifications

WebSocket

Should only

- receive events
- validate
- call services
- broadcast response

Never

- query Mongo directly
- contain business logic

Business logic belongs in Services.