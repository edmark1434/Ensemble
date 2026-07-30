# Forums Module

The Forums module is stored in MongoDB and follows a Reddit-inspired discussion system.

Current development should remain within the existing architecture and preserve compatibility with WebSocket and Notifications.

---

# Collections

MongoDB Collections

- forum_groups
- forum_discussions

PostgreSQL Tables

- notifications
- reports

The reports table schema is defined in:

```
backend/migrations/1784589404730_075-create-reports.js
```

Always refer to this migration when implementing report functionality.

---

# Features

## Forum Groups

Supported features

- Create Group
- Edit Group
- Delete Group
- Join Group
- Leave Group
- Search Groups
- View Members
- Manage Members
- Admin Permissions
- Moderator Permissions

---

## Discussions

Supported features

- Create Discussion
- Edit Discussion
- Delete Discussion
- Upload Images
- Like
- Unlike
- Save
- Unsave
- Share
- Tag Discussions

---

## Comments

Supported features

- Create Comment
- Edit Comment
- Delete Comment
- Like Comment
- Unlike Comment

---

## Replies

Supported features

- Create Reply
- Edit Reply
- Delete Reply
- Like Reply
- Unlike Reply

Replies should support nested discussion threads similar to Reddit.

---

## Feed

Supported feeds

- Latest
- Trending
- Saved
- My Posts
- Group Feed

---

## Filtering

Support filtering by

- Tags
- Group
- Author
- Date
- Popularity

---

# Reporting

Users should be able to report inappropriate content.

Supported report targets

- Discussion
- Comment
- Reply
- Forum Group
- User (if supported by the existing system)

The reports table is stored in PostgreSQL.

When implementing reporting:

- Use the existing reports table.
- Follow the schema defined in:

```
backend/migrations/1784589404730_075-create-reports.js
```

Do not create new report tables unless absolutely necessary.

If reporting already exists elsewhere in the project, reuse the existing services and repositories instead of duplicating logic.

---

# Reddit-inspired Behavior

The Forums module should behave similarly to Reddit.

Support

- Nested replies
- Threaded conversations
- Live updates
- Infinite scrolling
- Optimistic UI updates
- Rich discussion threads
- Real-time likes
- Real-time comments
- Real-time replies

---

# Realtime

Forum actions should continue using WebSocket.

Examples

- New Discussion
- Discussion Updated
- Discussion Deleted
- New Comment
- Comment Updated
- Comment Deleted
- New Reply
- Reply Updated
- Reply Deleted
- Like Count Updated
- Save Count Updated
- Member Joined
- Member Left
- Notification Received

Do not replace WebSocket functionality with polling.

---

# Notifications

Forum interactions should create notifications when appropriate.

Examples

- Someone commented on my discussion.
- Someone replied to my comment.
- Someone mentioned me.
- Someone liked my discussion (future).
- Someone liked my comment (future).

Notifications are stored in PostgreSQL.

---

# Development Guidelines

When implementing new forum features:

- Reuse existing controllers, services, repositories, and utilities.
- Preserve the current MongoDB document structure whenever possible.
- Make minimal code changes.
- Avoid rewriting unrelated modules.
- Keep WebSocket functionality working.
- Keep notification functionality working.
- Follow the existing Controller → Service → Repository architecture.
- Register all new API endpoints through the Route folder (`forum.js` and `api.js`) following the project's routing conventions.