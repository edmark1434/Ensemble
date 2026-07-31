const { pool } = require('../lib/database');

async function createNotification(notification) {
    try {
        let accountId = notification.account_id;

        // If account_id is not provided, get it from user_id
        if (!accountId && notification.user_id) {
            const getAccountIdQuery = `
                SELECT account_id
                FROM users
                WHERE user_id = $1;
            `;

            const accountResult = await pool.query(getAccountIdQuery, [
                notification.user_id,
            ]);

            if (accountResult.rows.length === 0) {
                throw new Error(
                    `No account found for user_id: ${notification.user_id}`
                );
            }

            accountId = accountResult.rows[0].account_id;
        }

        const query = `
            INSERT INTO notifications (
                message,
                is_read,
                reference_table,
                reference_prefix,
                reference_path,
                reference_id,
                account_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;

        const values = [
            notification.message,
            notification.is_read ?? false,
            notification.reference_table,
            notification.reference_prefix,
            notification.reference_path ?? null,
            notification.reference_id,
            accountId,
        ];

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (err) {
        console.error("Error creating notification:", err);
        throw err;
    }
}

async function getNotificationsByAccountId(accountId) {
    try {
        const query = `
            SELECT * FROM notifications
            WHERE account_id = $1
            ORDER BY created_at DESC;
        `;
        const { rows } = await pool.query(query, [accountId]);
        return rows;
    } catch (err) {
        console.error("Error fetching notifications:", err);
        throw err;
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE notification_id = $1
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [notificationId]);
        return rows[0];
    } catch (err) {
        console.error("Error marking notification as read:", err);
        throw err;
    }
}

async function markAllNotificationsAsRead(accountId) {
    try {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE account_id = $1
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [accountId]);
        return rows;
    } catch (err) {
        console.error("Error marking notifications as read:", err);
        throw err;
    }
}

module.exports = {
    createNotification,
    getNotificationsByAccountId,
    markNotificationAsRead,
    markAllNotificationsAsRead
}
