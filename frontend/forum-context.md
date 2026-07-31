# Forum Project Context

## Purpose

This document provides project context for AI assistants (Codex/ChatGPT).

Always read this file before making changes to the Forums module.

The goal is to preserve the existing architecture while implementing new features and fixing bugs.

Do not rewrite unrelated parts of the application.

---

# Tech Stack

## Frontend

- React
- TypeScript
- TailwindCSS
- WebSocket Client

## Backend

- Express.js
- MongoDB
- PostgreSQL
- AWS S3
- WebSocket

---

# Architecture

The backend follows a layered architecture.

```
Request
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
MongoDB / PostgreSQL
```

Responsibilities:

### Controller

Only responsible for:

- Receiving HTTP requests
- Parsing request data
- Calling services
- Returning responses

Controllers should NOT contain business logic.

---

### Service

Responsible for:

- Business logic
- Validation
- Authorization
- Calling repositories
- Triggering websocket events
- Creating notifications

Most feature implementations belong here.

---

### Repository

Responsible only for database access.

Repositories should:

- Query MongoDB
- Insert documents
- Update documents
- Delete documents

Repositories should NOT contain business logic.

---

# Backend Structure

## Controllers

```
backend/controllers/

forumGroupControllers.js
forumDiscussionsControllers.js
```

---

## Services

```
backend/services/

forumGroupServices.js
forumDiscussionsServices.js
```

---

## Repositories

```
backend/repositories/

forumGroupRepositories.js
forumDiscussionRepositories.js
```

---

## Routes

```
backend/Route/
```

Main routing:

```
api.js
```

Forum endpoints:

```
forum.js
```

All routes are registered through:

```
/api/*
```

---

## Server

```
backend/server.js
```

Express application starts here.

---

## MongoDB

Connection:

```
backend/lib/mongodb.js
```

Forums use MongoDB.

---

## WebSocket

```
backend/lib/websocket.js
```

Used for:

- live discussions
- live comments
- replies
- notifications
- realtime updates

Never remove websocket functionality.

---

## AWS S3

Forum images are uploaded to S3.

MongoDB stores only the object key.

Examples:

```
forum/image.jpg

forum-discussions/post.png
```

---

# Frontend

Forum UI lives inside

```
frontend/src/pages/user/4_forums/
```

Most forum components are inside this directory.

Examples:

- Forums.tsx
- SelectedGroup.tsx
- ExpandDiscussion.tsx
- NewDiscussionModal.tsx
- CreateGroupModal.tsx
- EditDiscussionModal.tsx
- DeleteDiscussionModal.tsx
- EditPostModal.tsx
- ReportMemberModal.tsx
- RemoveMemberModal.tsx
- etc.

---

# Databases

## MongoDB

Used only for Forums.

Collections:

- forum_groups
- forum_discussions

---

## PostgreSQL

Used for:

- accounts
- authentication
- notifications
- relational data

Do NOT move forum data into PostgreSQL.

---

# Mongo Collections

## Forum Group

```json
{
    "_id": "...",
    "image_url": "...",
    "group_name": "...",
    "description": "...",
    "members": [],
    "tags": [],
    "gradient": "...",
    "created_at": "...",
    "deleted_at": null,
    "status": "active"
}
```

Members

```json
{
    "role": "Admin",
    "userId": "...",
    "joined_at": "..."
}
```

Possible roles

- Admin
- Moderator
- Member

---

## Forum Discussion

```json
{
    "_id": "...",
    "title": "...",
    "content": "...",
    "tags": [],
    "imageKeys": [],
    "forum_group_id": "...",
    "user_id": "...",
    "attachments": [],
    "likes": [],
    "saves": [],
    "comments": [],
    "created_at": "...",
    "updated_at": "...",
    "deleted_at": null
}
```

---

# Project Goal

The Forums module should behave similarly to Reddit.

Users should be able to:

- Create groups
- Join groups
- Leave groups
- Create discussions
- Upload images
- Edit discussions
- Delete discussions
- Like discussions
- Save discussions
- Comment
- Reply
- Edit comments
- Delete comments
- Edit replies
- Delete replies
- Filter discussions
- Browse feeds

---

# Realtime

The application already supports WebSockets.

New features should continue using websocket events.

Examples:

- new discussion
- new comment
- reply
- like
- save
- member joined
- member left
- notification

Avoid introducing polling.

---

# Notifications

Notifications are stored in PostgreSQL.

Typical notification triggers:

- someone commented on my discussion
- someone replied to my comment
- someone mentioned me
- someone liked my discussion (future)
- someone liked my comment (future)

Notifications should include:

- account_id
- message
- reference_table
- reference_prefix
- reference_path
- reference_id

---

# Coding Guidelines

When making changes:

- Preserve existing architecture.
- Do not rewrite working code unnecessarily.
- Reuse existing helper functions.
- Keep functions small.
- Avoid duplicate logic.
- Maintain backward compatibility.
- Use soft deletes instead of permanent deletes.
- Follow existing naming conventions.
- Prefer extending existing services over creating new ones.
- Keep websocket functionality working.
- Keep notification functionality working.

---

# Things To Avoid

Do NOT:

- Move business logic into controllers.
- Query MongoDB directly from controllers.
- Break existing API responses.
- Remove websocket functionality.
- Change Mongo document structure unless necessary.
- Rewrite unrelated modules.
- Introduce unnecessary dependencies.

---

# Current Focus

Current development should focus only on the Forums module.

Priority:

1. Fix existing bugs.
2. Complete missing Reddit-like features.
3. Improve realtime synchronization.
4. Improve notification flow.
5. Improve UI behavior.
6. Preserve existing architecture.

If implementing a new feature, always search for existing services, repositories, and websocket utilities before creating new code.