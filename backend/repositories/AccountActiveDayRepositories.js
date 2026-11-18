const { pool } = require('../lib/Database');

/** Marks the account active today (database `CURRENT_DATE`). Repeat calls are no-ops. */
async function insertAccountActiveDay(accountId) {
  await pool.query(
    `INSERT INTO account_active_days (account_id, active_on)
     VALUES ($1, CURRENT_DATE)
     ON CONFLICT (account_id, active_on) DO NOTHING`,
    [accountId]
  );
}

module.exports = { insertAccountActiveDay };
