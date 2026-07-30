# Forum MongoDB Collections

The Forums module uses MongoDB.

Existing collection structures must remain backward-compatible.

Do not rename fields or change data types unless a migration strategy is explicitly required.

---

## Forum Discussions Collection

Collection:

```text
forum_discussions
```

Example document:

```json
{
  "_id": {
    "$oid": "6a6b382bed5f8a3285edf668"
  },
  "title": "Color Grading Tools",
  "content": "Hi guys What color grading tools you guys use?",
  "tags": [
    {
      "tag_id": 753063,
      "tag_name": "color theory"
    },
    {
      "tag_id": 355166,
      "tag_name": "cebu"
    },
    {
      "tag_id": 962043,
      "tag_name": "color grading"
    }
  ],
  "imageKeys": [
    "forum-discussions/preview_1785411624557_3f694cb6.gif",
    "forum-discussions/zeo254-completed-commission_1785411626510_5bd3f396.png"
  ],
  "forum_group_id": "6a6b1fa8409a6d13e473d5e7",
  "user_id": "4d21068c-401b-4606-b24e-b14d329ff0f9",
  "created_at": {
    "$date": "2026-07-30T11:40:27.046Z"
  },
  "updated_at": {
    "$date": "2026-07-30T11:40:27.046Z"
  },
  "deleted_at": null,
  "attachments": [],
  "likes": [],
  "saves": [],
  "comments": []
}
```

### Field rules

| Field | Type | Purpose |
|---|---|---|
| `_id` | MongoDB ObjectId | Discussion identifier |
| `title` | string | Discussion title |
| `content` | string | Main discussion body |
| `tags` | array | Discussion tags |
| `tags[].tag_id` | number | Existing tag identifier |
| `tags[].tag_name` | string | Display name of the tag |
| `imageKeys` | string array | AWS S3 object keys |
| `forum_group_id` | string | Parent group MongoDB ObjectId stored as a string |
| `user_id` | string | Author account UUID |
| `created_at` | Date | Creation timestamp |
| `updated_at` | Date | Last update timestamp |
| `deleted_at` | Date or null | Soft-deletion timestamp |
| `attachments` | array | Additional attachment data |
| `likes` | array | Users who liked the discussion |
| `saves` | array | Users who saved the discussion |
| `comments` | array | Embedded comments and replies |

### Important compatibility rules

- Keep `forum_group_id` as a string unless the existing repository already converts it to an ObjectId during queries.
- Keep `user_id` as a PostgreSQL account UUID string.
- Store only AWS S3 object keys in `imageKeys`.
- Do not replace `imageKeys` with full URLs.
- Use `deleted_at` for soft deletion.
- Update `updated_at` whenever editable discussion content changes.
- Prevent duplicate entries in `likes` and `saves`.
- Do not load soft-deleted discussions in active feeds.
- Validate `forum_group_id` before using it in MongoDB queries.
- Preserve existing field names exactly, including `imageKeys`.

---

## Forum Groups Collection

Collection:

```text
forum_groups
```

Example document:

```json
{
  "_id": {
    "$oid": "6a6b1fa8409a6d13e473d5e7"
  },
  "image_url": "forum/60f835c7-e2a1-4a87-9d62-c4bf70753439_1785405350092_07c162fc.jpg",
  "group_name": "Color Grading Society",
  "description": "Hello Welcome to Color Grading Society",
  "members": [
    {
      "role": "Admin",
      "userId": "4d21068c-401b-4606-b24e-b14d329ff0f9",
      "joined_at": {
        "$date": "2026-07-30T09:55:52.047Z"
      }
    }
  ],
  "tags": [
    {
      "tag": "color theory",
      "tag_id": 753063
    },
    {
      "tag": "cebu",
      "tag_id": 355166
    },
    {
      "tag": "color grading",
      "tag_id": 962043
    }
  ],
  "created_at": {
    "$date": "2026-07-30T09:55:52.047Z"
  },
  "gradient": "from-cyan-500 via-blue-500 to-indigo-500",
  "deleted_at": null,
  "status": "active"
}
```

### Field rules

| Field | Type | Purpose |
|---|---|---|
| `_id` | MongoDB ObjectId | Forum group identifier |
| `image_url` | string | AWS S3 object key for the group image |
| `group_name` | string | Group name |
| `description` | string | Group description |
| `members` | array | Group membership records |
| `members[].role` | string | Member role |
| `members[].userId` | string | PostgreSQL account UUID |
| `members[].joined_at` | Date | Date the user joined |
| `tags` | array | Group tags |
| `tags[].tag` | string | Tag display value |
| `tags[].tag_id` | number | Existing tag identifier |
| `created_at` | Date | Creation timestamp |
| `gradient` | string | Existing frontend Tailwind gradient value |
| `deleted_at` | Date or null | Soft-deletion timestamp |
| `status` | string | Group status such as `active` |

### Member roles

Existing roles include:

```text
Admin
Moderator
Member
```

Role values are case-sensitive unless the existing service normalizes them.

### Important compatibility rules

- Keep `image_url` as an AWS S3 object key.
- Do not rename `image_url` to `imageKey` unless all dependent code is migrated.
- Keep `members[].userId` as a UUID string.
- Prevent duplicate members with the same `userId`.
- The creator should remain an `Admin`.
- Use `deleted_at` for soft deletion.
- Active group queries should exclude documents with a non-null `deleted_at`.
- Restricted actions must check member roles on the backend.
- Do not trust a role sent by the frontend.
- Keep the existing `gradient` value because it is used by the frontend.
- Preserve the current difference between:
  - Group tag name: `tags[].tag`
  - Discussion tag name: `tags[].tag_name`

Do not normalize those two structures without updating every existing consumer.

---

## Relationship Between Collections

A forum discussion belongs to a forum group through:

```text
forum_discussions.forum_group_id
```

This value corresponds to:

```text
forum_groups._id.toString()
```

Before creating a discussion:

1. Validate that `forum_group_id` is a valid MongoDB ObjectId string.
2. Confirm that the group exists.
3. Confirm that the group is active.
4. Confirm that `deleted_at` is null.
5. Apply the existing membership rules before allowing creation.

When a group is soft-deleted:

- Do not automatically permanently delete discussions.
- Exclude its discussions from active feeds unless the existing product rules specify otherwise.
- Preserve historical records for reports and moderation.

---

## Comments and Replies

Comments currently live inside:

```text
forum_discussions.comments
```

Before changing the comment structure, inspect the existing repository and frontend rendering logic.

Do not invent a new comments collection unless the current embedded structure is proven unsuitable and a migration plan is approved.

When adding or updating comments and replies:

- Preserve existing comment and reply identifiers.
- Preserve parent-child relationships.
- Add ownership checks.
- Use soft deletion where supported.
- Update only the targeted nested item where possible.
- Avoid replacing the entire discussion document when an atomic update can be used.