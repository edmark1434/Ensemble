# Notifications

Notifications use PostgreSQL.

Forum notifications are NOT stored in MongoDB.

Create notifications when

- Someone comments on my discussion
- Someone replies to my comment
- Someone mentions me
- Someone likes my discussion (future)
- Someone likes my comment (future)

Notification table contains

- account_id
- message
- reference_table
- reference_prefix
- reference_path
- reference_id
- created_at
- is_read

Services are responsible for creating notifications.

Repositories should not create notification records.