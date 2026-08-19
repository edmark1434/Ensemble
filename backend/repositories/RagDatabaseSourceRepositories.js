const { pool } = require('../lib/Database');

async function getPublicPlatformSettings() {
  const result = await pool.query(`
    SELECT setting_key, setting_value, updated_at
    FROM platform_settings
    WHERE setting_key = ANY($1::varchar[])
    ORDER BY setting_key
  `, [['platform', 'economy']]);
  return result.rows;
}

async function getPlans() {
  const result = await pool.query(`
    SELECT name, description, billing_period, amount_php_cents,
           days_of_trials, updated_at
    FROM plans
    WHERE deleted_at IS NULL
    ORDER BY amount_php_cents, name
  `);
  return result.rows;
}

module.exports = { getPublicPlatformSettings, getPlans };
