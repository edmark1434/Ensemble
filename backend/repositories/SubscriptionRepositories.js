const { pool } = require('../lib/Database');


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

async function forceUpdateSubscriptionByUserIdRepositories(userId, tierName) {
    try {
        const query = `
            UPDATE subscriptions
            SET plan_id = (SELECT plan_id FROM plans WHERE name = $1 LIMIT 1)
            WHERE user_id = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [tierName, userId]);
        return result.rows[0];
    } catch (err) {
        console.error("Error force updating subscription:", err);
        throw err;
    }
}


async function getSubscriptionPlanDetailsByUserIdRepositories(userId) {
    try{
        const query = `SELECT P.NAME AS PLAN_NAME, S.STATUS, S.CURRENT_PERIOD_END AS RENEWS_AT,
                              S.CANCEL_AT_PERIOD_END, S.CANCELED_AT
                       FROM SUBSCRIPTIONS S
                       JOIN PLANS P ON S.PLAN_ID = P.PLAN_ID
                       WHERE S.USER_ID = $1`;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }catch(err){
        console.error("Error fetching subscription plan details:", err);
        throw err;
    }
}

async function getPlandetailsByPlanIdRepositories(planId) {
    try{
        const query = `SELECT * FROM PLANS WHERE PLAN_ID = $1`;
        const result = await pool.query(query, [planId]);
        return result.rows[0];
    }catch(err){
        console.error("Error fetching plan details:", err);
        throw err;
    }
}

async function updateSubscriptionBySubscriptionId(subscriptionId, updates) {
    try {
        if (!subscriptionId) {
            throw new Error("subscriptionId is required.");
        }

        if (!updates || Object.keys(updates).length === 0) {
            throw new Error("No fields to update.");
        }

        const setClauses = [];
        const values = [];
        let index = 1;

        for (const [column, value] of Object.entries(updates)) {
            if (value === undefined) continue;

            setClauses.push(`${column} = $${index}`);
            values.push(value);
            index++;
        }

        // Always update updated_at
        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(subscriptionId);

        const query = `
            UPDATE subscriptions
            SET ${setClauses.join(", ")}
            WHERE subscription_id = $${index}
            RETURNING *;
        `;

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (err) {
        console.error("Error updating subscription:", err);
        throw err;
    }
}

async function updateSubscriptionInvoiceByXenditPlanIdRepositories(xenditPlanId) {
    try{
        if (!xenditPlanId) {
            throw new Error("xenditPlanId is required.");
        }
        const query = `
            UPDATE subscription_invoices SET STATUS = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE xendit_plan_id = $1 AND status NOT IN ('CANCELLED', 'SUCCEEDED') RETURNING *;
        `;
        const result = await pool.query(query, [xenditPlanId]);
        return result.rows[0];
    }catch(err){
        console.error("Error updating subscription invoice:", err);
        throw err;
    }
}

async function createSubscriptionInvoice(
    {
        xendit_cycle_id = null,
        xendit_plan_id = null,
        amount_php_cents = null,
        status = null,
        attempt_count = 0,
        billing_period_start = null,
        billing_period_end = null,
        paid_at = null,
        failed_at = null,
        updated_at = new Date().toISOString(),
        subscription_id = null
    }
){
    try{
        const query = `
            INSERT INTO subscription_invoices (
                xendit_cycle_id,
                xendit_plan_id,
                amount_php_cents,
                status,
                attempt_count,
                billing_period_start,
                billing_period_end,
                paid_at,
                failed_at,
                updated_at,
                subscription_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *;
        `;
        const result = await pool.query(query, [xendit_cycle_id, xendit_plan_id, amount_php_cents, status, attempt_count, billing_period_start, billing_period_end, paid_at, failed_at, updated_at, subscription_id]);
        return result.rows[0];
    }catch(err){
        console.error("Error creating subscription invoice:", err);
        throw err;
    }
}

async function updateSubscriptionInvoiceByCycleIdRepositories(xenditCycleId, updates) {
    try {
        if (!xenditCycleId) {
            throw new Error("xenditCycleId is required.");
        }
        if (!updates || Object.keys(updates).length === 0) {
            throw new Error("No fields to update.");
        }
        const setClauses = [];
        const values = [];
        let index = 1;

        for (const [column, value] of Object.entries(updates)) {
            if (value === undefined) continue;

            setClauses.push(`${column} = $${index}`);
            values.push(value);
            index++;
        }

        // Always update updated_at
        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(xenditCycleId);

        const query = `
            UPDATE subscription_invoices
            SET ${setClauses.join(", ")}
            WHERE xendit_cycle_id = $${index}
            RETURNING *;
        `;

        const result = await pool.query(query, values);

        return result.rows[0];
    }
    catch(err){
        console.error("Error updating subscription invoice by cycle ID:", err);
        throw err;
    }
}

async function getSubscriptionInvoiceByCycleIdRepositories(xenditCycleId) {
    try {
        if (!xenditCycleId) {
            throw new Error("xenditCycleId is required.");
        }
        const query = `
            SELECT * FROM subscription_invoices WHERE xendit_cycle_id = $1;
        `;
        const result = await pool.query(query, [xenditCycleId]);
        return result.rows[0];
    } catch (err) {
        console.error("Error getting subscription invoice by cycle ID:", err);
        throw err;
    }
}

async function getFreePlanRepositories() {
    try{
        const query = `SELECT * FROM PLANS WHERE amount_php_cents = 0`;
        const result = await pool.query(query);
        return result.rows[0];
    }catch(err){
        console.error("Error fetching plan details by plan name:", err);
        throw err;
    }
}

async function getCancelledSubscriptionRepositories(userId) {
    try{
        const query = `
            SELECT subscription_id FROM subscriptions WHERE CANCEL_AT_PERIOD_END = true AND NOW() > CURRENT_PERIOD_END
        `;
        const result = await pool.query(query);
        return result.rows;
    }catch(err){
        console.error("Error fetching cancelled subscription:", err);
        throw err;
    }
}

async function getSubscriptionByXenditPlanIdRepositories(xenditPlanId) {
    try{
        const query = `SELECT subscription_id FROM subscriptions WHERE xendit_plan_id = $1`;
        const result = await pool.query(query, [xenditPlanId]);
        console.log("Fetched subscription by xendit plan id:", result.rows[0]);
        return result.rows[0].subscription_id;
    }catch(err){
        console.error("Error fetching subscription by xendit plan id:", err);
        throw err;
    }
}

async function updateSubscriptionInvoiceAmountRepositories(xenditPlanId, amount_php_cents) {
    try{
        const query = `
            UPDATE subscription_invoices SET amount_php_cents = $1, updated_at = CURRENT_TIMESTAMP WHERE xendit_plan_id = $2 AND status NOT IN ('CANCELLED', 'SUCCEEDED');
        `;
        const result = await pool.query(query, [amount_php_cents, xenditPlanId]);
        return result.rows[0];
    }catch(err){
        console.error("Error updating subscription invoice amount:", err);
        throw err;
    }
}

async function getSubscriptionBySubscriptionIdRepositories(subscriptionId) {
    try{
        const query = `SELECT * FROM subscriptions WHERE subscription_id = $1 limit 1`;
        const result = await pool.query(query, [subscriptionId]);
        return result.rows[0];
    }
    catch(err){
        console.error("Error fetching subscription by subscription id:", err);
        throw err;
    }
}

module.exports = {
    getAllPlanRepositories,
    getSubcriptionByUserIdRepositories,
    getSubscriptionPlanDetailsByUserIdRepositories,
    getPlandetailsByPlanIdRepositories,
    updateSubscriptionBySubscriptionId,
    updateSubscriptionInvoiceByXenditPlanIdRepositories,
    createSubscriptionInvoice,
    updateSubscriptionInvoiceByCycleIdRepositories,
    getSubscriptionInvoiceByCycleIdRepositories,
    getFreePlanRepositories,
    getCancelledSubscriptionRepositories,
    getSubscriptionByXenditPlanIdRepositories,
    updateSubscriptionInvoiceAmountRepositories,
    getSubscriptionBySubscriptionIdRepositories,
    forceUpdateSubscriptionByUserIdRepositories
};
