const { pool } = require('../lib/Database');

async function getVideoUploadPlanFeaturesForAccount(accountId) {
    const { rows } = await pool.query(`
        WITH effective_plan AS (
            SELECT COALESCE(
                (SELECT s.plan_id FROM users u
                 JOIN subscriptions s ON s.user_id = u.user_id
                 WHERE u.account_id = $1 AND UPPER(s.status) IN ('ACTIVE', 'TRIALING')
                   AND (s.current_period_end IS NULL OR s.current_period_end > CURRENT_TIMESTAMP)
                 ORDER BY s.updated_at DESC, s.created_at DESC, s.subscription_id DESC LIMIT 1),
                (SELECT plan_id FROM plans WHERE LOWER(name) = 'free' ORDER BY plan_id LIMIT 1)
            ) AS plan_id
        )
        SELECT p.plan_id, p.name, pf.value,
               p.plan_id = (SELECT plan_id FROM effective_plan) AS is_current
        FROM plans p
        LEFT JOIN features f ON f.feature_key = 'video_upload_resolution'
        LEFT JOIN plan_features pf ON pf.plan_id = p.plan_id AND pf.feature_id = f.feature_id
        WHERE LOWER(p.name) IN ('free', 'premium', 'business')
           OR p.plan_id = (SELECT plan_id FROM effective_plan)
        ORDER BY CASE LOWER(p.name) WHEN 'free' THEN 0 WHEN 'premium' THEN 1 ELSE 2 END, p.plan_id`, [accountId]);
    return rows;
}

module.exports = { getVideoUploadPlanFeaturesForAccount };
