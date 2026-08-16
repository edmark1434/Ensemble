const { pool } = require('./lib/Database.js');
async function run() {
    try {
        const query = `
            UPDATE subscriptions
            SET plan_id = (SELECT plan_id FROM plans WHERE name = $1 LIMIT 1)
            WHERE user_id = $2
            RETURNING *;
        `;
        const res = await pool.query(query, ['Premium', '89ab0dd5-470f-41de-b95d-1ce9ddf9bd13']);
        console.log("Success:", res.rows);
    } catch (e) {
        console.error("DB Error:", e);
    }
    process.exit(0);
}
run();
