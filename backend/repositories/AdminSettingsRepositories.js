const { pool } = require('../lib/Database');
const {
  DEFAULT_SETTINGS,
  SECTION_KEYS,
  flattenSection,
  listDefaultConfigurationRows,
  assembleSection,
  deepMergeSettings,
  configurationKeyPrefixFilter,
  sectionKeyFromConfigurationKey,
} = require('../lib/PlatformConfiguration');

function stripMeta(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const clone = { ...value };
  delete clone._meta;
  return clone;
}

async function ensureDefaultSettings() {
  const rows = listDefaultConfigurationRows();
  for (const row of rows) {
    await pool.query(
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
}

async function readSectionRows(sectionKey) {
  const result = await pool.query(
    `SELECT configuration_key, name, description, current_value_literal, default_value_literal, updated_at
     FROM configuration
     WHERE configuration_key LIKE $1
     ORDER BY configuration_key`,
    [configurationKeyPrefixFilter(sectionKey)]
  );
  return result.rows;
}

async function getSectionValue(key) {
  const defaults = DEFAULT_SETTINGS[key];
  if (!defaults) return null;
  const rows = await readSectionRows(key);
  if (!rows.length) return structuredClone(defaults);
  return assembleSection(key, defaults, rows);
}

async function getSettingsOverview() {
  await ensureDefaultSettings();

  const loaded = await Promise.all(
    SECTION_KEYS.map(async (key) => {
      const rows = await readSectionRows(key);
      const defaults = DEFAULT_SETTINGS[key];
      const value = rows.length
        ? assembleSection(key, defaults, rows)
        : structuredClone(defaults);
      const updatedAt = rows.reduce((latest, row) => {
        if (!row.updated_at) return latest;
        if (!latest) return row.updated_at;
        return new Date(row.updated_at) > new Date(latest) ? row.updated_at : latest;
      }, null);
      const isDefault =
        !rows.length ||
        rows.every((row) => row.current_value_literal === row.default_value_literal);
      return { key, value, updatedAt, isDefault };
    })
  );

  const [staffResult, historyResult] = await Promise.all([
    pool.query(`
      SELECT s.staff_id, s.role,
        COALESCE(a.display_name, NULLIF(TRIM(s.first_name || ' ' || s.last_name), ''), s.email_address) AS name
      FROM staff s
      INNER JOIN accounts a ON a.account_id = s.account_id
      WHERE a.deleted_at IS NULL
      ORDER BY s.role, name
    `),
    pool.query(`
      SELECT configuration_key, name, updated_at
      FROM configuration
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 12
    `),
  ]);

  const sectionMap = Object.fromEntries(loaded.map((s) => [s.key, s]));

  return {
    lastUpdated: new Date().toISOString(),
    sections: sectionMap,
    defaults: DEFAULT_SETTINGS,
    staffEditors: staffResult.rows.map((r) => ({
      staffId: r.staff_id,
      name: r.name,
      role: r.role,
    })),
    changeHistory: historyResult.rows.map((r, i) => ({
      id: `chg-${i}`,
      section: r.name || sectionKeyFromConfigurationKey(r.configuration_key),
      updatedAt: r.updated_at,
      updatedBy: 'System',
    })),
    alerts: buildSettingsAlerts(sectionMap),
    dataSources: {
      persisted: ['configuration'],
      tables: ['configuration'],
    },
  };
}

function buildSettingsAlerts(sections) {
  const alerts = [];
  if (sections.platform?.value?.maintenanceMode) {
    alerts.push({
      id: 'maintenance',
      message: 'Maintenance mode is ON — users may see a downtime banner.',
      severity: 'warning',
    });
  }
  if (!sections.platform?.value?.registrationEnabled) {
    alerts.push({
      id: 'registration-off',
      message: 'New user registration is disabled.',
      severity: 'warning',
    });
  }
  if (sections.security?.value?.requireStaff2fa === false) {
    alerts.push({
      id: '2fa-off',
      message: 'Staff two-factor authentication is not required.',
      severity: 'info',
    });
  }
  if (sections.security?.value?.ipAllowlistEnabled) {
    const ips = sections.security.value.allowedAdminIps || [];
    alerts.push({
      id: 'ip-allowlist',
      message: `Admin IP allowlist is enabled (${ips.length} address${ips.length === 1 ? '' : 'es'}).`,
      severity: ips.length ? 'info' : 'warning',
    });
  }
  const inactivePkgs = (sections.economy?.value?.creditPackages || []).filter((p) => !p.active);
  if (inactivePkgs.length) {
    alerts.push({
      id: 'inactive-pkgs',
      message: `${inactivePkgs.length} credit package(s) marked inactive.`,
      severity: 'info',
    });
  }
  return alerts;
}

async function updateSettingsSection(sectionKey, values) {
  if (!DEFAULT_SETTINGS[sectionKey]) {
    throw new Error(`Unknown settings section: ${sectionKey}`);
  }

  await ensureDefaultSettings();

  const current = await getSectionValue(sectionKey);
  const merged = stripMeta(
    deepMergeSettings(DEFAULT_SETTINGS[sectionKey], current, values)
  );

  if (sectionKey === 'security' && Array.isArray(merged.allowedAdminIps)) {
    merged.allowedAdminIps = merged.allowedAdminIps
      .map((ip) => String(ip || '').trim())
      .filter(Boolean);
  }

  const rows = flattenSection(sectionKey, merged, DEFAULT_SETTINGS[sectionKey]);
  for (const row of rows) {
    await pool.query(
      `INSERT INTO configuration (
         configuration_key, name, description, current_value_literal, default_value_literal, updated_at
       ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (configuration_key) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         current_value_literal = EXCLUDED.current_value_literal,
         default_value_literal = EXCLUDED.default_value_literal,
         updated_at = CURRENT_TIMESTAMP`,
      [
        row.configuration_key,
        row.name,
        row.description,
        row.current_value_literal,
        row.default_value_literal,
      ]
    );
  }

  return getSettingsOverview();
}

module.exports = {
  getSettingsOverview,
  updateSettingsSection,
  ensureDefaultSettings,
  getSectionValue,
  deepMergeSettings,
  DEFAULT_SETTINGS,
};
