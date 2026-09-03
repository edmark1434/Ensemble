const {
  DEFAULT_SETTINGS,
  SECTION_KEYS,
  flattenSection,
  listDefaultConfigurationRows,
  assembleSection,
  deepMergeSettings,
  isManagedConfigurationKey,
} = require('../lib/PlatformConfiguration');

async function tableExists(pgm, tableName) {
  const result = await pgm.db.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = $1`,
    [tableName]
  );
  return result.rows.length > 0;
}

async function upsertConfigurationRow(pgm, row, updatedAt) {
  await pgm.db.query(
    `INSERT INTO configuration (
       configuration_key, name, description, current_value_literal, default_value_literal, updated_at
     ) VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamp, CURRENT_TIMESTAMP))
     ON CONFLICT (configuration_key) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       current_value_literal = EXCLUDED.current_value_literal,
       default_value_literal = EXCLUDED.default_value_literal,
       updated_at = EXCLUDED.updated_at`,
    [
      row.configuration_key,
      row.name,
      row.description,
      row.current_value_literal,
      row.default_value_literal,
      updatedAt || null,
    ]
  );
}

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  const hasConfiguration = await tableExists(pgm, 'configuration');
  if (!hasConfiguration) {
    await pgm.db.query(`
      CREATE TABLE configuration (
        configuration_key varchar(100) PRIMARY KEY NOT NULL,
        name text NOT NULL,
        description text NOT NULL,
        current_value_literal text NOT NULL,
        default_value_literal text NOT NULL,
        updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    await pgm.db.query(`
      ALTER TABLE configuration
        ALTER COLUMN configuration_key TYPE varchar(100),
        ALTER COLUMN name TYPE text,
        ALTER COLUMN current_value_literal TYPE text,
        ALTER COLUMN default_value_literal TYPE text
    `);
  }

  if (await tableExists(pgm, 'platform_settings')) {
    const existing = await pgm.db.query(
      `SELECT setting_key, setting_value, updated_at
       FROM platform_settings`
    );

    for (const row of existing.rows) {
      const defaults = DEFAULT_SETTINGS[row.setting_key];
      if (!defaults) continue;
      const merged = deepMergeSettings(defaults, row.setting_value, {});
      const flattened = flattenSection(row.setting_key, merged, defaults);
      for (const item of flattened) {
        await upsertConfigurationRow(pgm, item, row.updated_at);
      }
    }

    await pgm.db.query('DROP TABLE IF EXISTS platform_settings');
  }

  for (const row of listDefaultConfigurationRows()) {
    await pgm.db.query(
      `INSERT INTO configuration (
         configuration_key, name, description, current_value_literal, default_value_literal, updated_at
       ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (configuration_key) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         default_value_literal = EXCLUDED.default_value_literal`,
      [
        row.configuration_key,
        row.name,
        row.description,
        row.current_value_literal,
        row.default_value_literal,
      ]
    );
  }
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = async (pgm) => {
  if (!(await tableExists(pgm, 'configuration'))) return;

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      setting_key varchar(100) PRIMARY KEY NOT NULL,
      setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      updated_by_staff_id uuid
    )
  `);
  await pgm.db.query(`
    ALTER TABLE platform_settings
      DROP CONSTRAINT IF EXISTS platform_settings_updated_by_staff_id_fkey
  `);
  await pgm.db.query(`
    ALTER TABLE platform_settings
      ADD CONSTRAINT platform_settings_updated_by_staff_id_fkey
      FOREIGN KEY (updated_by_staff_id) REFERENCES staff(staff_id)
  `);

  const configRows = await pgm.db.query(
    `SELECT configuration_key, current_value_literal, default_value_literal, updated_at
     FROM configuration`
  );

  for (const sectionKey of SECTION_KEYS) {
    const sectionRows = configRows.rows.filter(
      (row) => row.configuration_key.startsWith(`${sectionKey}.`)
    );
    const value = assembleSection(sectionKey, DEFAULT_SETTINGS[sectionKey], sectionRows);
    const updatedAt = sectionRows.reduce((latest, row) => {
      if (!row.updated_at) return latest;
      if (!latest) return row.updated_at;
      return new Date(row.updated_at) > new Date(latest) ? row.updated_at : latest;
    }, null);

    await pgm.db.query(
      `INSERT INTO platform_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2::jsonb, COALESCE($3::timestamptz, NOW()))
       ON CONFLICT (setting_key) DO UPDATE SET
         setting_value = EXCLUDED.setting_value,
         updated_at = EXCLUDED.updated_at`,
      [sectionKey, JSON.stringify(value), updatedAt]
    );
  }

  const managedKeys = configRows.rows
    .map((row) => row.configuration_key)
    .filter(isManagedConfigurationKey);
  if (managedKeys.length) {
    await pgm.db.query(
      `DELETE FROM configuration WHERE configuration_key = ANY($1::varchar[])`,
      [managedKeys]
    );
  }
};
