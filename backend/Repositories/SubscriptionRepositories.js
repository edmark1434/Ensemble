const { pool } = require('../lib/database');


async function getAllPlanRepositories() {
    try {
        const query = `
            SELECT
                p.plan_id,
                p.name,
                p.description,
                p.amount_php_cents as price,
                p.billing_period,
                p.days_of_trials,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'feature_id', f.feature_id,
                            'feature_key', f.feature_key,
                            'name', f.name,
                            'description', f.description,
                            'value', pf.value
                        )
                        ORDER BY f.feature_id
                    ) FILTER (WHERE f.feature_id IS NOT NULL),
                    '[]'::json
                ) AS features

            FROM plans p
            LEFT JOIN plan_features pf
                ON p.plan_id = pf.plan_id
            LEFT JOIN features f
                ON pf.feature_id = f.feature_id

            GROUP BY
                p.plan_id,
                p.name,
                p.description,
                p.amount_php_cents,
                p.billing_period

            ORDER BY p.plan_id;
        `;

        const result = await pool.query(query);
        return result.rows;

    } catch (err) {
        console.error("Error fetching plans:", err);
        throw err;
    }
}

async function getSubcriptionByUserIdRepositories(userId) {
    try{
        const query = `SELECT * FROM subscriptions WHERE user_id = $1`;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }catch(err){
        console.error("Error fetching subscription:", err);
        throw err;
    }
}
module.exports = {
    getAllPlanRepositories,
    getSubcriptionByUserIdRepositories
};