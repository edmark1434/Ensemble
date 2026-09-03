const { pool } = require('../lib/Database');

const DEFAULT_SETTINGS = {
  platform: {
    siteName: 'Ensemble',
    tagline: 'Creative collaboration platform',
    maintenanceMode: false,
    registrationEnabled: true,
    defaultUserMerit: 50,
    supportEmail: 'support@ensemble.app',
    maxUploadMb: 50,
    sessionTimeoutMinutes: 60,
  },
  moderation: {
    spamFilterEnabled: true,
    autoFlagProfanity: true,
    autoHoldNewAccounts: false,
    forumLinkScanning: true,
    marketplaceListingReview: true,
    disputeAutoAssign: true,
    maxWarningsBeforeSuspend: 3,
    autoEscalateHighPriority: true,
    reportToTicketAutoCreate: true,
  },
  economy: {
    creditPackages: [
      { id: 'pkg-starter', name: 'Starter Pack', credits: 500, pricePhp: 499, active: true, salesCount: 0 },
      { id: 'pkg-pro', name: 'Pro Pack', credits: 2500, pricePhp: 1999, active: true, salesCount: 0 },
      { id: 'pkg-studio', name: 'Studio Pack', credits: 10000, pricePhp: 6999, active: true, salesCount: 0 },
      { id: 'pkg-enterprise', name: 'Enterprise Pack', credits: 50000, pricePhp: 29999, active: false, salesCount: 0 },
    ],
    feeSettings: [
      { id: 'fee-job', label: 'Job transaction', percent: 10, flatFee: 0, appliesTo: 'Completed job contracts', paidBy: 'Freelancer', reason: 'Commission for successfully completed jobs' },
      { id: 'fee-gig', label: 'Gig transaction', percent: 10, flatFee: 0, appliesTo: 'Gig purchases', paidBy: 'Freelancer', reason: 'Commission when a client purchases a gig' },
      { id: 'fee-marketplace', label: 'Asset marketplace sale', percent: 15, flatFee: 0, appliesTo: 'Asset sales', paidBy: 'Asset creator', reason: 'Marketplace commission' },
      { id: 'fee-credit-purchase', label: 'Credit purchase', percent: 0, flatFee: 0, appliesTo: 'Credit top-ups', paidBy: 'Buyer', reason: 'Keep purchasing credits simple' },
      { id: 'fee-credit-refund', label: 'Credit refund', percent: 0, flatFee: 0, appliesTo: 'Credit refunds', paidBy: '—', reason: 'Better for user trust' },
      { id: 'fee-cashout', label: 'Withdrawal / cashout', percent: 3.5, flatFee: 0, appliesTo: 'Withdrawals', paidBy: 'Seller/Freelancer', reason: 'Covers withdrawal and payment processing (recommended 2–5%)' },
      { id: 'fee-cancellation', label: 'Job/Gig cancellation', percent: 2.5, flatFee: 0, appliesTo: 'Cancellations', paidBy: 'Depends on situation', reason: 'Discourages abuse and cancellations (recommended 0–5%)' },
      { id: 'fee-dispute', label: 'Dispute', percent: 0, flatFee: 0, appliesTo: 'Disputes', paidBy: '—', reason: 'Do not charge users for requesting protection' },
      { id: 'fee-forum', label: 'Forum', percent: 0, flatFee: 0, appliesTo: 'Forum activity', paidBy: '—', reason: 'Community feature should remain accessible' },
      { id: 'fee-job-post', label: 'Posting a job', percent: 0, flatFee: 0, appliesTo: 'Job posts', paidBy: 'Client', reason: 'Encourages clients to post opportunities' },
      { id: 'fee-gig-create', label: 'Creating a gig', percent: 0, flatFee: 0, appliesTo: 'Gig listings', paidBy: 'Freelancer', reason: 'Encourages freelancers to offer services' },
      { id: 'fee-asset-upload', label: 'Uploading an asset', percent: 0, flatFee: 0, appliesTo: 'Asset listings', paidBy: 'Asset creator', reason: 'Encourages marketplace inventory' },
    ],
    marketplaceSettings: {
      listingFeeCredits: 0,
      transactionFeePercent: 15,
      escrowHoldDays: 7,
      minPayoutCredits: 500,
      refundWindowDays: 14,
    },
  },
  notifications: {
    emailNewSignups: true,
    emailNewTickets: true,
    emailDisputeOpened: true,
    emailHighPriorityReports: true,
    emailWeeklyDigest: false,
    slackWebhookEnabled: false,
    slackWebhookUrl: '',
    notifyAssigneeOnTicket: true,
    notifyRequesterOnResolution: true,
  },
  security: {
    requireStaff2fa: false,
    minPasswordLength: 8,
    lockoutAfterFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    auditLogRetentionDays: 90,
    ipAllowlistEnabled: false,
    allowedAdminIps: [],
    forceHttps: true,
  },
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Deep-merge defaults ← current DB ← patch. Arrays from patch replace entirely. */
function deepMergeSettings(defaults, current, patch) {
  const base = isPlainObject(defaults) ? { ...defaults } : {};
  const fromDb = isPlainObject(current) ? current : {};
  const fromPatch = isPlainObject(patch) ? patch : {};

  const merged = { ...base, ...fromDb };

  for (const [key, value] of Object.entries(fromPatch)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      merged[key] = value;
    } else if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = deepMergeSettings(base[key] || {}, merged[key], value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

function stripMeta(value) {
  if (!isPlainObject(value)) return value;
  const clone = { ...value };
  delete clone._meta;
  return clone;
}

async function ensureDefaultSettings() {
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    await pool.query(
      `INSERT INTO platform_settings (setting_key, setting_value)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (setting_key) DO NOTHING`,
      [key, JSON.stringify(DEFAULT_SETTINGS[key])]
    );
  }
}

async function readSectionRow(key) {
  const result = await pool.query(
    `SELECT setting_value, updated_at, updated_by_staff_id
     FROM platform_settings
     WHERE setting_key = $1`,
    [key]
  );
  return result.rows[0] || null;
}

async function getSectionValue(key) {
  const defaults = DEFAULT_SETTINGS[key];
  if (!defaults) return null;
  const row = await readSectionRow(key);
  if (!row) return { ...structuredClone(defaults) };
  return deepMergeSettings(defaults, row.setting_value, {});
}

async function getSettingsOverview() {
  await ensureDefaultSettings();

  const sections = Object.keys(DEFAULT_SETTINGS);
  const loaded = await Promise.all(
    sections.map(async (key) => {
      const row = await readSectionRow(key);
      const defaults = DEFAULT_SETTINGS[key];
      const value = row
        ? deepMergeSettings(defaults, row.setting_value, {})
        : structuredClone(defaults);
      return {
        key,
        value,
        updatedAt: row?.updated_at || null,
        isDefault: !row,
      };
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
      SELECT setting_key, updated_at,
        COALESCE(
          NULLIF(TRIM(s.first_name || ' ' || s.last_name), ''),
          a.display_name,
          'System'
        ) AS updated_by
      FROM platform_settings ps
      LEFT JOIN staff s ON s.staff_id = ps.updated_by_staff_id
      LEFT JOIN accounts a ON a.account_id = s.account_id
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
      section: r.setting_key,
      updatedAt: r.updated_at,
      updatedBy: r.updated_by,
    })),
    alerts: buildSettingsAlerts(sectionMap),
    dataSources: {
      persisted: ['platform_settings'],
      tables: ['platform_settings'],
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

async function updateSettingsSection(sectionKey, values, staffId) {
  if (!DEFAULT_SETTINGS[sectionKey]) {
    throw new Error(`Unknown settings section: ${sectionKey}`);
  }

  await ensureDefaultSettings();

  const row = await readSectionRow(sectionKey);
  const current = row?.setting_value || {};
  const merged = stripMeta(
    deepMergeSettings(DEFAULT_SETTINGS[sectionKey], current, values)
  );

  // Normalize security IP list
  if (sectionKey === 'security' && Array.isArray(merged.allowedAdminIps)) {
    merged.allowedAdminIps = merged.allowedAdminIps
      .map((ip) => String(ip || '').trim())
      .filter(Boolean);
  }

  await pool.query(
    `INSERT INTO platform_settings (setting_key, setting_value, updated_at, updated_by_staff_id)
     VALUES ($1, $2::jsonb, NOW(), $3)
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = $2::jsonb, updated_at = NOW(), updated_by_staff_id = $3`,
    [sectionKey, JSON.stringify(merged), staffId || null]
  );

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
