const { pool } = require('../lib/Database');

async function getUploadPlanForAccount(accountId) {
    const { rows } = await pool.query(`
        SELECT p.name
        FROM users u
        JOIN subscriptions s ON s.user_id = u.user_id
        JOIN plans p ON p.plan_id = s.plan_id
        WHERE u.account_id = $1 AND UPPER(s.status) = 'ACTIVE'
          AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
        ORDER BY s.updated_at DESC, s.created_at DESC, s.subscription_id DESC
        LIMIT 1`, [accountId]);
    return rows[0]?.name || 'Free';
}

module.exports = { getUploadPlanForAccount };
