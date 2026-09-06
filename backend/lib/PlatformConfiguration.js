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

const SECTION_KEYS = Object.freeze(Object.keys(DEFAULT_SETTINGS));

const FIELD_META = {
  'platform.siteName': { name: 'Site name', description: 'Public platform name shown in the product.' },
  'platform.tagline': { name: 'Tagline', description: 'Short description shown alongside the platform name.' },
  'platform.maintenanceMode': { name: 'Maintenance mode', description: 'When true, users may see a downtime banner.' },
  'platform.registrationEnabled': { name: 'Registration enabled', description: 'Allow new user sign-ups.' },
  'platform.defaultUserMerit': { name: 'Default user merit', description: 'Starting merit score assigned to new accounts.' },
  'platform.supportEmail': { name: 'Support email', description: 'Public support contact address.' },
  'platform.maxUploadMb': { name: 'Max upload size (MB)', description: 'Maximum file upload size in megabytes.' },
  'platform.sessionTimeoutMinutes': { name: 'Session timeout (minutes)', description: 'Idle session lifetime in minutes.' },
  'moderation.spamFilterEnabled': { name: 'Spam filter', description: 'Enable automated spam filtering.' },
  'moderation.autoFlagProfanity': { name: 'Auto-flag profanity', description: 'Automatically flag content that contains profanity.' },
  'moderation.autoHoldNewAccounts': { name: 'Hold new accounts', description: 'Delay full access for new accounts pending review.' },
  'moderation.forumLinkScanning': { name: 'Forum link scanning', description: 'Scan outbound links in forum discussions.' },
  'moderation.marketplaceListingReview': { name: 'Marketplace listing review', description: 'Queue new marketplace listings for staff review.' },
  'moderation.disputeAutoAssign': { name: 'Auto-assign disputes', description: 'Automatically assign open disputes to staff.' },
  'moderation.maxWarningsBeforeSuspend': { name: 'Warnings before suspend', description: 'Warning count that triggers a suspension.' },
  'moderation.autoEscalateHighPriority': { name: 'Auto-escalate high priority', description: 'Escalate high-priority reports automatically.' },
  'moderation.reportToTicketAutoCreate': { name: 'Report to ticket', description: 'Create a support ticket when a report is filed.' },
  'economy.creditPackages': { name: 'Credit packages', description: 'Purchasable credit packages offered to users.' },
  'economy.feeSettings': { name: 'Fee settings', description: 'Platform fee schedule for jobs, gigs, assets, and cashouts.' },
  'economy.marketplaceSettings.listingFeeCredits': { name: 'Listing fee (credits)', description: 'Credits charged to list an asset.' },
  'economy.marketplaceSettings.transactionFeePercent': { name: 'Marketplace transaction fee (%)', description: 'Percent fee taken from asset sales.' },
  'economy.marketplaceSettings.escrowHoldDays': { name: 'Escrow hold (days)', description: 'Days to hold marketplace escrow before release.' },
  'economy.marketplaceSettings.minPayoutCredits': { name: 'Minimum payout (credits)', description: 'Minimum credit balance required to cash out.' },
  'economy.marketplaceSettings.refundWindowDays': { name: 'Refund window (days)', description: 'Days after purchase during which a refund may be requested.' },
  'notifications.emailNewSignups': { name: 'Email new sign-ups', description: 'Notify staff by email when a new account registers.' },
  'notifications.emailNewTickets': { name: 'Email new tickets', description: 'Notify staff by email when a ticket is created.' },
  'notifications.emailDisputeOpened': { name: 'Email disputes', description: 'Notify staff by email when a dispute is opened.' },
  'notifications.emailHighPriorityReports': { name: 'Email high-priority reports', description: 'Notify staff by email for high-priority reports.' },
  'notifications.emailWeeklyDigest': { name: 'Weekly digest', description: 'Send a weekly operational digest email.' },
  'notifications.slackWebhookEnabled': { name: 'Slack webhook', description: 'Send operational alerts to Slack.' },
  'notifications.slackWebhookUrl': { name: 'Slack webhook URL', description: 'Incoming Slack webhook endpoint.' },
  'notifications.notifyAssigneeOnTicket': { name: 'Notify ticket assignee', description: 'Notify the assigned staff member when a ticket changes.' },
  'notifications.notifyRequesterOnResolution': { name: 'Notify requester on resolution', description: 'Notify the requester when a ticket is resolved.' },
  'security.requireStaff2fa': { name: 'Require staff 2FA', description: 'Require two-factor authentication for staff accounts.' },
  'security.minPasswordLength': { name: 'Minimum password length', description: 'Minimum number of characters required for passwords.' },
  'security.lockoutAfterFailedAttempts': { name: 'Lockout after failed attempts', description: 'Failed login attempts before a lockout.' },
  'security.lockoutDurationMinutes': { name: 'Lockout duration (minutes)', description: 'How long an account stays locked after failed attempts.' },
  'security.auditLogRetentionDays': { name: 'Audit log retention (days)', description: 'Days to retain administrative audit logs.' },
  'security.ipAllowlistEnabled': { name: 'Admin IP allowlist', description: 'Restrict admin access to listed IP addresses.' },
  'security.allowedAdminIps': { name: 'Allowed admin IPs', description: 'IP addresses permitted when the admin allowlist is enabled.' },
  'security.forceHttps': { name: 'Force HTTPS', description: 'Redirect unencrypted traffic to HTTPS.' },
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function humanizeKey(configurationKey) {
  const leaf = String(configurationKey || '').split('.').pop() || configurationKey;
  return leaf.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

function metaFor(configurationKey) {
  const meta = FIELD_META[configurationKey];
  return {
    name: meta?.name || humanizeKey(configurationKey),
    description: meta?.description || 'Platform configuration value.',
  };
}

function toLiteral(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

function fromLiteral(literal, defaultValue) {
  if (typeof defaultValue === 'boolean') return String(literal).toLowerCase() === 'true';
  if (typeof defaultValue === 'number') {
    const parsed = Number(literal);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }
  if (Array.isArray(defaultValue) || isPlainObject(defaultValue)) {
    try {
      const parsed = JSON.parse(literal || '');
      if (Array.isArray(defaultValue) && Array.isArray(parsed)) return parsed;
      if (isPlainObject(defaultValue) && isPlainObject(parsed)) return parsed;
      return structuredClone(defaultValue);
    } catch {
      return structuredClone(defaultValue);
    }
  }
  if (literal == null) return defaultValue ?? '';
  return String(literal);
}

function isLeafValue(value) {
  return !isPlainObject(value);
}

function flattenSection(sectionKey, current, defaults) {
  const rows = [];

  function walk(prefix, curr, def) {
    const template = def !== undefined ? def : curr;
    if (template === undefined) return;

    if (isLeafValue(template)) {
      const meta = metaFor(prefix);
      const value = curr !== undefined ? curr : def;
      rows.push({
        configuration_key: prefix,
        name: meta.name,
        description: meta.description,
        current_value_literal: toLiteral(value),
        default_value_literal: toLiteral(def !== undefined ? def : value),
      });
      return;
    }

    const keys = new Set([
      ...Object.keys(isPlainObject(def) ? def : {}),
      ...Object.keys(isPlainObject(curr) ? curr : {}),
    ]);
    for (const key of keys) {
      walk(
        `${prefix}.${key}`,
        isPlainObject(curr) ? curr[key] : undefined,
        isPlainObject(def) ? def[key] : undefined
      );
    }
  }

  walk(sectionKey, current, defaults);
  return rows;
}

function listDefaultConfigurationRows() {
  return SECTION_KEYS.flatMap((sectionKey) =>
    flattenSection(sectionKey, DEFAULT_SETTINGS[sectionKey], DEFAULT_SETTINGS[sectionKey])
  );
}

function rowMapFromRows(rows) {
  return Object.fromEntries((rows || []).map((row) => [row.configuration_key, row]));
}

function assembleSection(sectionKey, defaults, rowsOrMap) {
  const rowsByKey = Array.isArray(rowsOrMap) ? rowMapFromRows(rowsOrMap) : rowsOrMap || {};

  function walk(prefix, def) {
    if (isLeafValue(def)) {
      const row = rowsByKey[prefix];
      if (!row) return structuredClone(def);
      return fromLiteral(row.current_value_literal, def);
    }
    const assembled = {};
    for (const key of Object.keys(def || {})) {
      assembled[key] = walk(`${prefix}.${key}`, def[key]);
    }
    return assembled;
  }

  return walk(sectionKey, defaults);
}

function sectionKeyFromConfigurationKey(configurationKey) {
  const [section] = String(configurationKey || '').split('.');
  return section || configurationKey;
}

function isManagedConfigurationKey(configurationKey) {
  const section = sectionKeyFromConfigurationKey(configurationKey);
  return SECTION_KEYS.includes(section) && String(configurationKey).includes('.');
}

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

function configurationKeyPrefixFilter(sectionKey) {
  return `${sectionKey}.%`;
}

module.exports = {
  DEFAULT_SETTINGS,
  SECTION_KEYS,
  FIELD_META,
  isPlainObject,
  toLiteral,
  fromLiteral,
  flattenSection,
  listDefaultConfigurationRows,
  assembleSection,
  rowMapFromRows,
  sectionKeyFromConfigurationKey,
  isManagedConfigurationKey,
  deepMergeSettings,
  configurationKeyPrefixFilter,
};
