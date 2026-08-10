const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:123jp@localhost:5432/ensemble_test' });

async function run() {
    const q = `
        SELECT 
            A.DISPLAY_NAME AS NAME, 
            COALESCE(
                (SELECT COUNT(*) FROM account_followers WHERE followed_id = A.ACCOUNT_ID), 0
            ) AS followers_count,
            (SELECT COUNT(*) FROM account_followers WHERE follower_id = A.ACCOUNT_ID) AS following_count
        FROM ACCOUNTS A
        WHERE A.ACCOUNT_ID = 'fca54115-9e5a-4605-9c44-4cd17b60ea2e' 
        LIMIT 1;
    `;
    try {
        const res = await pool.query(q);
        console.log(res.rows[0]);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
