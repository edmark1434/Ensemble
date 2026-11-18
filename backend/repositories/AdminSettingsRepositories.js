const crypto = require('crypto');
const { pool } = require('../lib/Database');
const {
  DEFAULT_SETTINGS,
  SECTION_KEYS,
  flattenSection,
  listDefaultConfigurationRows,
  assembleSection,
  deepMergeSettings,
  rowMapFromRows,
  configurationKeyPrefixFilter,
} = require('../lib/PlatformConfiguration');

const SETTINGS_EVENT_CODE = 'SETTINGS_UPDATED';

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
  // Removed System Settings sections.
  await pool.query(`DELETE FROM configuration WHERE configuration_key LIKE 'moderation.%'`);
  await pool.query(`DELETE FROM configuration WHERE configuration_key LIKE 'notifications.%'`);
}

/** Defaults only change with a deploy, so request paths seed them once per process. */
let defaultsSeeded = null;
function ensureDefaultSettingsOnce() {
  if (!defaultsSeeded) {
    defaultsSeeded = ensureDefaultSettings().catch((err) => {
      defaultsSeeded = null;
      throw err;
    });
  }
  return defaultsSeeded;
}

/**
 * Per-process section cache. Saves through writeSettingsSection clear it at once;
 * other processes and raw SQL edits are picked up within the TTL.
 */
const SECTION_CACHE_TTL_MS = Math.max(0, Number(process.env.SETTINGS_CACHE_TTL_MS ?? 15000) || 0);
const sectionCache = new Map();

function clearSettingsCache() {
  sectionCache.clear();
}

async function readSectionRows(sectionKey, db = pool) {
  const result = await db.query(
    `SELECT configuration_key, name, description, current_value_literal, default_value_literal, updated_at
     FROM configuration
     WHERE configuration_key LIKE $1
     ORDER BY configuration_key`,
    [configurationKeyPrefixFilter(sectionKey)]
  );
  return result.rows;
}

/**
 * Stable fingerprint of a section's stored values. A save sends back the version it
 * started from, so a save made on top of someone else's newer change is refused.
 */
function computeSectionVersion(rows) {
  const body = (rows || [])
    .map((row) => `${row.configuration_key}=${row.current_value_literal ?? ''}`)
    .sort()
    .join('\n');
  return crypto.createHash('sha1').update(body).digest('hex').slice(0, 16);
}

function sectionValueFromRows(sectionKey, rows) {
  const defaults = DEFAULT_SETTINGS[sectionKey];
  return rows.length ? assembleSection(sectionKey, defaults, rows) : structuredClone(defaults);
}

async function loadSectionValue(key) {
  const rows = await readSectionRows(key);
  return sectionValueFromRows(key, rows);
}

async function getSectionValue(key) {
  const defaults = DEFAULT_SETTINGS[key];
  if (!defaults) return null;
  if (!SECTION_CACHE_TTL_MS) return loadSectionValue(key);

  const now = Date.now();
  let entry = sectionCache.get(key);
  if (!entry || entry.expiresAt <= now) {
    const promise = loadSectionValue(key);
    entry = { promise, expiresAt: now + SECTION_CACHE_TTL_MS };
    sectionCache.set(key, entry);
    promise.catch(() => {
      if (sectionCache.get(key) === entry) sectionCache.delete(key);
    });
  }
  return structuredClone(await entry.promise);
}

/** Every section, uncached, with its last-saved time, default state and version. */
async function loadAllSettingsSections() {
  await ensureDefaultSettingsOnce();
  const loaded = await Promise.all(
    SECTION_KEYS.map(async (key) => {
      const rows = await readSectionRows(key);
      const updatedAt = rows.reduce((latest, row) => {
        if (!row.updated_at) return latest;
        if (!latest) return row.updated_at;
        return new Date(row.updated_at) > new Date(latest) ? row.updated_at : latest;
      }, null);
      const isDefault =
        !rows.length ||
        rows.every((row) => row.current_value_literal === row.default_value_literal);
      return {
        key,
        value: sectionValueFromRows(key, rows),
        updatedAt,
        isDefault,
        version: computeSectionVersion(rows),
      };
    })
  );
  return Object.fromEntries(loaded.map((section) => [section.key, section]));
}

function versionConflictError() {
  const error = new Error('These settings were changed by someone else after you opened them.');
  error.code = 'SETTINGS_VERSION_CONFLICT';
  error.statusCode = 409;
  return error;
}

/**
 * Save one section in a single transaction.
 *
 * The section is locked for the duration, so two admins saving at once cannot interleave.
 * `buildNextValue(currentValue)` runs against the locked current value and returns
 * `{ value, changes }`; it may throw to abort. Only rows whose value changed get a new
 * `updated_at`. `afterWrite(client, result)` runs inside the same transaction (the audit row).
 *
 * @returns {Promise<{ changed: boolean, changes: unknown[], version: string }>}
 */
async function writeSettingsSection(sectionKey, { baseVersion = null, buildNextValue, afterWrite } = {}) {
  const defaults = DEFAULT_SETTINGS[sectionKey];
  if (!defaults) throw new Error(`Unknown settings section: ${sectionKey}`);

  await ensureDefaultSettingsOnce();

  const client = await pool.connect();
  let committed = false;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`configuration:${sectionKey}`]);

    const currentRows = await readSectionRows(sectionKey, client);
    const currentVersion = computeSectionVersion(currentRows);
    if (baseVersion && baseVersion !== currentVersion) throw versionConflictError();

    const previousValue = sectionValueFromRows(sectionKey, currentRows);
    const { value: nextValue, changes = [] } = await buildNextValue(structuredClone(previousValue));

    const nextRows = flattenSection(sectionKey, nextValue, defaults);
    const keptKeys = nextRows.map((row) => row.configuration_key);
    const currentByKey = rowMapFromRows(currentRows);

    const removed = await client.query(
      `DELETE FROM configuration
       WHERE configuration_key LIKE $1
         AND NOT (configuration_key = ANY($2::text[]))`,
      [configurationKeyPrefixFilter(sectionKey), keptKeys]
    );
    let valueRowsChanged = removed.rowCount || 0;

    for (const row of nextRows) {
      const existing = currentByKey[row.configuration_key];
      const valueChanged = !existing || existing.current_value_literal !== row.current_value_literal;
      const metaChanged =
        !existing ||
        existing.name !== row.name ||
        existing.description !== row.description ||
        existing.default_value_literal !== row.default_value_literal;
      if (!valueChanged && !metaChanged) continue;
      if (valueChanged) valueRowsChanged += 1;
      await client.query(
        `INSERT INTO configuration (
           configuration_key, name, description, current_value_literal, default_value_literal, updated_at
         ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (configuration_key) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           current_value_literal = EXCLUDED.current_value_literal,
           default_value_literal = EXCLUDED.default_value_literal,
           updated_at = CASE WHEN $6::boolean THEN CURRENT_TIMESTAMP ELSE configuration.updated_at END`,
        [
          row.configuration_key,
          row.name,
          row.description,
          row.current_value_literal,
          row.default_value_literal,
          valueChanged,
        ]
      );
    }

    const changed = valueRowsChanged > 0 || changes.length > 0;
    if (changed && afterWrite) {
      await afterWrite(client, { previousValue, nextValue, changes });
    }

    const commit = await client.query('COMMIT');
    if (String(commit?.command || '').toUpperCase() === 'ROLLBACK') {
      const error = new Error('Settings could not be saved. Nothing was changed.');
      error.code = 'COMMIT_ROLLED_BACK';
      error.statusCode = 500;
      throw error;
    }
    committed = true;

    const savedRows = changed ? await readSectionRows(sectionKey) : currentRows;
    return { changed, changes, version: computeSectionVersion(savedRows) };
  } catch (err) {
    if (!committed) await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    clearSettingsCache();
  }
}

/** Staff accounts with role and whether they have an authenticator app set up. */
async function listSettingsStaff() {
  const result = await pool.query(`
    SELECT s.staff_id, s.role, a.handle,
      COALESCE(a.display_name, NULLIF(TRIM(s.first_name || ' ' || s.last_name), ''), s.email_address) AS name,
      EXISTS (
        SELECT 1 FROM account_authentication_secrets aas WHERE aas.account_id = s.account_id
      ) AS has_authenticator
    FROM staff s
    INNER JOIN accounts a ON a.account_id = s.account_id
    WHERE a.deleted_at IS NULL
    ORDER BY (s.role = 'Admin') DESC, s.role, name
  `);
  return result.rows.map((row) => ({
    staffId: row.staff_id,
    name: row.name,
    handle: row.handle || null,
    role: row.role,
    hasAuthenticator: Boolean(row.has_authenticator),
  }));
}

/** Most recent settings saves from the audit log, with the staff member who saved. */
async function listSettingsChangeHistory({ limit = 15 } = {}) {
  const result = await pool.query(
    `
    SELECT aa.account_activity_id, aa.reference_id, aa.metadata, aa.created_at,
      s.role AS actor_role,
      COALESCE(
        sa.display_name,
        NULLIF(TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, '')), '')
      ) AS actor_name
    FROM account_activity aa
    LEFT JOIN staff s ON s.staff_id = aa.actor_staff_id
    LEFT JOIN accounts sa ON sa.account_id = s.account_id
    WHERE aa.event_code = $1
    ORDER BY aa.created_at DESC, aa.account_activity_id DESC
    LIMIT $2
    `,
    [SETTINGS_EVENT_CODE, Math.min(Math.max(Number(limit) || 15, 1), 50)]
  );
  return result.rows.map((row) => {
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    return {
      id: row.account_activity_id,
      section: metadata.section || row.reference_id || 'settings',
      updatedAt: row.created_at,
      updatedBy: row.actor_name || 'Unknown staff',
      actorRole: row.actor_role || null,
      changes: Array.isArray(metadata.changes) ? metadata.changes : [],
      changeCount: Number(metadata.changeCount) || (Array.isArray(metadata.changes) ? metadata.changes.length : 0),
    };
  });
}

/** Paid top-ups grouped by credits and price, to count sales of each package. */
async function countPaidTopupsByCreditsAndPrice() {
  const result = await pool.query(`
    SELECT credits, amount, COUNT(*)::int AS sales
    FROM payments
    WHERE payment_type = 'TOPUP' AND status = 'PAID'
    GROUP BY credits, amount
  `);
  return result.rows.map((row) => ({
    credits: Number(row.credits),
    pricePhp: Number(row.amount),
    sales: Number(row.sales) || 0,
  }));
}

module.exports = {
  SETTINGS_EVENT_CODE,
  SECTION_CACHE_TTL_MS,
  ensureDefaultSettings,
  getSectionValue,
  clearSettingsCache,
  loadAllSettingsSections,
  writeSettingsSection,
  listSettingsStaff,
  listSettingsChangeHistory,
  countPaidTopupsByCreditsAndPrice,
  deepMergeSettings,
  DEFAULT_SETTINGS,
};
