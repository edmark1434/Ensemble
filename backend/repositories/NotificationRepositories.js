const { pool } = require('../lib/Database');

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

async function createCashoutNotificationOnce(notification) {
    try {
        return await createNotification(notification);
    } catch (error) {
        if (error.code !== '23505') throw error;
        const result = await pool.query(
            `SELECT * FROM notifications
             WHERE reference_table = 'cashouts'
               AND reference_id = $1
               AND reference_prefix = $2
             LIMIT 1`,
            [notification.reference_id, notification.reference_prefix]
        );
        return result.rows[0] || null;
    }
}

async function getNotificationsByAccountId(accountIds) {
    try {
        const query = `
            SELECT * FROM notifications
            WHERE account_id = ANY($1::uuid[])
            ORDER BY created_at DESC;
        `;
        const { rows } = await pool.query(query, [accountIds]);
        return rows;
    } catch (err) {
        console.error("Error fetching notifications:", err);
        throw err;
    }
}

async function markNotificationAsRead(notificationId, accountIds) {
    try {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE notification_id = $1
              AND account_id = ANY($2::uuid[])
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [notificationId, accountIds]);
        return rows[0];
    } catch (err) {
        console.error("Error marking notification as read:", err);
        throw err;
    }
}

async function markAllNotificationsAsRead(accountIds) {
    try {
        const query = `
            UPDATE notifications
            SET is_read = true
            WHERE account_id = ANY($1::uuid[])
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [accountIds]);
        return rows;
    } catch (err) {
        console.error("Error marking notifications as read:", err);
        throw err;
    }
}

module.exports = {
    createNotification,
    createCashoutNotificationOnce,
    getNotificationsByAccountId,
    markNotificationAsRead,
    markAllNotificationsAsRead
}
