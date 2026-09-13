const { pool } = require('../lib/Database');
const { DEFAULT_SETTINGS, assembleSection } = require('../lib/PlatformConfiguration');

async function getPublicPlatformSettings() {
  const result = await pool.query(`
    SELECT configuration_key, current_value_literal, updated_at
    FROM configuration
    WHERE configuration_key LIKE 'platform.%'
       OR configuration_key LIKE 'economy.%'
    ORDER BY configuration_key
  `);
  const rows = result.rows;
  return ['platform', 'economy'].map((settingKey) => {
    const sectionRows = rows.filter((row) => row.configuration_key.startsWith(`${settingKey}.`));
    const updatedAt = sectionRows.reduce((latest, row) => {
      if (!row.updated_at) return latest;
      if (!latest) return row.updated_at;
      return new Date(row.updated_at) > new Date(latest) ? row.updated_at : latest;
    }, null);
    return {
      setting_key: settingKey,
      setting_value: assembleSection(settingKey, DEFAULT_SETTINGS[settingKey], sectionRows),
      updated_at: updatedAt,
    };
  });
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
