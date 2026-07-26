const { pool } = require('../lib/database');

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
      { id: 'fee-marketplace', label: 'Marketplace transaction fee', percent: 8, flatFee: 0, appliesTo: 'Asset sales' },
      { id: 'fee-job', label: 'Jobs & gigs platform fee', percent: 12, flatFee: 50, appliesTo: 'Job contracts' },
      { id: 'fee-payout', label: 'Payout processing fee', percent: 2.5, flatFee: 25, appliesTo: 'Withdrawals' },
      { id: 'fee-listing', label: 'Asset listing fee', percent: 0, flatFee: 100, appliesTo: 'New listings' },
    ],
    marketplaceSettings: {
      listingFeeCredits: 100,
      transactionFeePercent: 8,
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

async function loadSettingsSection(key) {
  const result = await pool.query(
    'SELECT setting_value, updated_at, updated_by_staff_id FROM platform_settings WHERE setting_key = $1',
    [key]
  );
  if (!result.rows.length) return { ...DEFAULT_SETTINGS[key], _meta: null };
  return { ...DEFAULT_SETTINGS[key], ...result.rows[0].setting_value, _meta: result.rows[0] };
}

async function getSettingsOverview() {
  const sections = ['platform', 'moderation', 'economy', 'notifications', 'security'];
  const loaded = await Promise.all(
    sections.map(async (key) => {
      const row = await pool.query(
        'SELECT setting_value, updated_at FROM platform_settings WHERE setting_key = $1',
        [key]
      );
      const defaults = DEFAULT_SETTINGS[key];
      const value = row.rows.length ? { ...defaults, ...row.rows[0].setting_value } : defaults;
      const updatedAt = row.rows.length ? row.rows[0].updated_at : null;
      return { key, value, updatedAt, isDefault: !row.rows.length };
    })
  );

  const staffResult = await pool.query(`
    SELECT s.staff_id, s.role, COALESCE(a.display_name, s.first_name || ' ' || s.last_name) AS name
    FROM staff s
    INNER JOIN accounts a ON a.account_id = s.account_id
    ORDER BY s.role
  `);

  const historyResult = await pool.query(`
    SELECT setting_key, updated_at,
      COALESCE(s.first_name || ' ' || s.last_name, 'System') AS updated_by
    FROM platform_settings ps
    LEFT JOIN staff s ON s.staff_id = ps.updated_by_staff_id
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 10
  `);

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
  const merged = { ...DEFAULT_SETTINGS[sectionKey], ...values };
  delete merged._meta;

  await pool.query(
    `INSERT INTO platform_settings (setting_key, setting_value, updated_at, updated_by_staff_id)
     VALUES ($1, $2::jsonb, NOW(), $3)
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = $2::jsonb, updated_at = NOW(), updated_by_staff_id = $3`,
    [sectionKey, JSON.stringify(merged), staffId || null]
  );

  return getSettingsOverview();
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

module.exports = {
  getSettingsOverview,
  updateSettingsSection,
  ensureDefaultSettings,
  DEFAULT_SETTINGS,
};
