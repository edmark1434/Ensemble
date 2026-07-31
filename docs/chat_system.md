# Chat System

Backend

Controllers

- InboxControllers.js

Services

- InboxServices.js

Repositories

- InboxRepositories.js

Routes

- Route/inbox.js

Realtime

- lib/websocket.js

Database

- MongoDB

Frontend

Floating Chat

Layout.tsx

chat_bubble/

- chat_main.tsx
- ChatWindow.tsx

Inbox

inbox/

- inbox_components
- inbox_functions
- inbox_pages
- inbox_dataset.tsx
- inbox_main.tsx

Profile

Profile.tsx

Current Trigger

POST

/api/inbox/two-accounts

Creates or returns direct conversation.

Chat Types

- Direct
- Engagement
- Group
- Ticket
- Dispute

Features

## Features

- Realtime messaging
- Floating chat windows
- Inbox
- Multiple chat windows
- Create group
- Direct chat
- Engagement chat
- Ticket chat
- Dispute chat
- Text messages
- Image messages
- File attachments
- Reply to message
- Edit message
- Delete message
- Reactions
- Pin / Unpin messages
- Rename conversation
- Search messages
- Latest message preview
- Unread count
- Read receipts (Seen)
- Delivered status
- Typing indicator
- Online / Offline status
- Notifications
- Video call
- Avatar sync with Profile
- Name sync with Profile

Marketplace Chat

Header displays

- Job
- Gig
- Asset

Must include

- title
- preview
- View Details button

Redirect to listing.

Images

Reuse existing S3 upload.

Store object keys only.