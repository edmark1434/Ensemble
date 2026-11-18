const crypto = require('crypto');
const {
  DEFAULT_SETTINGS,
  SECTION_KEYS,
  FIELD_META,
  isPlainObject,
} = require('../lib/PlatformConfiguration');
const {
  SETTINGS_EVENT_CODE,
  SECTION_CACHE_TTL_MS,
  loadAllSettingsSections,
  writeSettingsSection,
  listSettingsStaff,
  listSettingsChangeHistory,
  countPaidTopupsByCreditsAndPrice,
} = require('../repositories/AdminSettingsRepositories');
const { recordAccountActivity } = require('../repositories/AccountActivityRepositories');
const { resolveStaffForSession } = require('../lib/StaffSession');
const { canonicalAllowlistEntry, ipMatchesAllowlist, normalizeIp } = require('../lib/IpAllowlist');

class SettingsServiceError extends Error {
  constructor(message, statusCode = 400, { code = null, errors = null } = {}) {
    super(message);
    this.name = 'SettingsServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

const SECTION_LABELS = Object.freeze({
  platform: 'Platform',
  economy: 'Economy',
  security: 'Security',
});

/**
 * Bounds for every editable value. The overview sends these to the page so the form
 * and the backend agree; the backend remains the authority.
 */
const SETTINGS_RULES = Object.freeze({
  platform: {
    siteName: { min: 1, max: 60 },
    supportEmail: { max: 254 },
    // The sessionId cookie lasts 30 days from sign-in (UserControllers.createSessionIdCookie),
    // so a longer idle timeout would have no effect.
    sessionTimeoutDays: { min: 1, max: 30, integer: true },
  },
  economy: {
    creditValuePhp: { min: 0.01, max: 1000, decimals: 4 },
    maxPackages: 24,
    packageName: { min: 1, max: 40 },
    // Matches validateTopupRequest: top-ups outside 10–1,000,000 credits are refused.
    packageCredits: { min: 10, max: 1000000, integer: true },
    packagePricePhp: { min: 1, max: 1000000, decimals: 2 },
    feePercent: { min: 0, max: 100, decimals: 2 },
    feeFlat: { min: 0, max: 100000, integer: true },
    listingFeeCredits: { min: 0, max: 100000, integer: true },
    transactionFeePercent: { min: 0, max: 100, decimals: 2 },
    minPayoutCredits: { min: 1, max: 1000000, integer: true },
    refundWindowDays: { min: 0, max: 365, integer: true },
  },
  security: {
    // docs/security.md: signup passwords are at least eight characters.
    minPasswordLength: { min: 8, max: 64, integer: true },
    lockoutAfterFailedAttempts: { min: 3, max: 20, integer: true },
    lockoutDurationMinutes: { min: 5, max: 1440, integer: true },
    auditLogRetentionDays: { min: 30, max: 1825, integer: true },
    maxAllowedAdminIps: 50,
  },
});

/**
 * How each fee row is actually charged in code (lib/PlatformFeeSettings.js,
 * DashboardRepositories milestone release, CashoutServices). Rows marked `unused`
 * are not collected anywhere, so the page shows them read-only.
 */
const FEE_USAGE = Object.freeze({
  'fee-job': { mode: 'commission', percent: true, flat: true, note: 'Deducted from each milestone payment released on a job contract.' },
  'fee-gig': { mode: 'commission', percent: true, flat: true, note: 'Deducted from each milestone payment released on a gig order.' },
  'fee-cashout': { mode: 'commission', percent: true, flat: false, note: 'Percent of each cashout. Any flat cashout fee is set in server configuration.' },
  'fee-marketplace': { mode: 'linked', percent: false, flat: false, note: 'Uses the marketplace transaction fee under Marketplace rules.' },
  'fee-job-post': { mode: 'flat', percent: false, flat: true, note: 'Charged when a client publishes a job.' },
  'fee-gig-create': { mode: 'flat', percent: false, flat: true, note: 'Charged when a freelancer publishes a gig.' },
  'fee-asset-upload': { mode: 'flat', percent: false, flat: true, note: 'Charged to list an asset only while the marketplace listing fee is 0.' },
  'fee-credit-purchase': { mode: 'unused', percent: false, flat: false, note: 'Not collected. Top-ups are charged at the package or credit price.' },
  'fee-credit-refund': { mode: 'unused', percent: false, flat: false, note: 'Not collected.' },
  'fee-cancellation': { mode: 'unused', percent: false, flat: false, note: 'Not collected. Cancelling a job or gig does not charge a fee yet.' },
  'fee-dispute': { mode: 'unused', percent: false, flat: false, note: 'Not collected.' },
  'fee-forum': { mode: 'unused', percent: false, flat: false, note: 'Not collected.' },
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const PACKAGE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

function emailDeliveryConfigured() {
  return Boolean(process.env.BREVO_API_KEY);
}

// ---------------------------------------------------------------------------
// Field readers. Each records a message under its path and returns a best-effort value.
// ---------------------------------------------------------------------------

function makeContext() {
  const errors = {};
  return {
    errors,
    fail(path, message) {
      if (!errors[path]) errors[path] = message;
    },
  };
}

function formatBound(value) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function readNumber(raw, path, ctx, rule) {
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    ctx.fail(path, 'Enter a number.');
    return null;
  }
  if (rule.integer && !Number.isInteger(value)) {
    ctx.fail(path, 'Enter a whole number.');
    return null;
  }
  if (value < rule.min || value > rule.max) {
    ctx.fail(path, `Enter a value from ${formatBound(rule.min)} to ${formatBound(rule.max)}.`);
    return null;
  }
  if (rule.decimals != null) {
    const factor = 10 ** rule.decimals;
    const scaled = Math.round(value * factor);
    if (Math.abs(scaled - value * factor) > 1e-6) {
      ctx.fail(path, `Use at most ${rule.decimals} decimal place${rule.decimals === 1 ? '' : 's'}.`);
      return null;
    }
    return scaled / factor;
  }
  return value;
}

function readBoolean(raw, path, ctx) {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === 'false') return raw === 'true';
  ctx.fail(path, 'Must be on or off.');
  return false;
}

function readText(raw, path, ctx, rule) {
  if (typeof raw !== 'string') {
    ctx.fail(path, 'Enter text.');
    return '';
  }
  const text = raw.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
  if (text.length < (rule.min || 0)) ctx.fail(path, 'Required.');
  else if (rule.max && text.length > rule.max) ctx.fail(path, `Use ${rule.max} characters or fewer.`);
  return text;
}

function readEmail(raw, path, ctx, rule) {
  const text = readText(raw, path, ctx, { min: 1, max: rule.max });
  if (text && !EMAIL_PATTERN.test(text)) ctx.fail(path, 'Enter a valid email address.');
  return text.toLowerCase();
}

/** Patch value when sent, otherwise the stored value. */
function pick(patch, current, key) {
  return patch[key] !== undefined ? patch[key] : current?.[key];
}

// ---------------------------------------------------------------------------
// Section normalizers: only known keys survive, so arbitrary keys are never stored.
// ---------------------------------------------------------------------------

function normalizePlatform(patch, current, ctx) {
  const rules = SETTINGS_RULES.platform;
  let days = pick(patch, current, 'sessionTimeoutDays');
  if (patch.sessionTimeoutDays === undefined && patch.sessionTimeoutMinutes !== undefined) {
    const minutes = Number(patch.sessionTimeoutMinutes);
    days = Number.isFinite(minutes) && minutes > 0 ? Math.max(1, Math.round(minutes / 1440)) : patch.sessionTimeoutMinutes;
  }
  return {
    siteName: readText(pick(patch, current, 'siteName'), 'siteName', ctx, rules.siteName),
    maintenanceMode: readBoolean(pick(patch, current, 'maintenanceMode'), 'maintenanceMode', ctx),
    registrationEnabled: readBoolean(pick(patch, current, 'registrationEnabled'), 'registrationEnabled', ctx),
    supportEmail: readEmail(pick(patch, current, 'supportEmail'), 'supportEmail', ctx, rules.supportEmail),
    sessionTimeoutDays: readNumber(days, 'sessionTimeoutDays', ctx, rules.sessionTimeoutDays),
  };
}

function normalizePackages(input, ctx) {
  const rules = SETTINGS_RULES.economy;
  if (!Array.isArray(input)) {
    ctx.fail('creditPackages', 'Packages must be a list.');
    return [];
  }
  if (input.length > rules.maxPackages) {
    ctx.fail('creditPackages', `Keep ${rules.maxPackages} packages or fewer.`);
  }

  const seenIds = new Set();
  const activeByCredits = new Map();
  const packages = [];
  input.forEach((pkg, index) => {
    if (!isPlainObject(pkg)) {
      ctx.fail(`creditPackages.${index}`, 'Invalid package.');
      return;
    }
    let id = typeof pkg.id === 'string' ? pkg.id.trim() : '';
    if (!PACKAGE_ID_PATTERN.test(id) || seenIds.has(id)) {
      id = `pkg-${crypto.randomBytes(4).toString('hex')}`;
    }
    seenIds.add(id);

    const base = `creditPackages.${id}`;
    const name = readText(pkg.name, `${base}.name`, ctx, rules.packageName);
    const credits = readNumber(pkg.credits, `${base}.credits`, ctx, rules.packageCredits);
    const pricePhp = readNumber(pkg.pricePhp, `${base}.pricePhp`, ctx, rules.packagePricePhp);
    const active = pkg.active === undefined ? true : readBoolean(pkg.active, `${base}.active`, ctx);

    // validateTopupRequest picks the package by credit amount, so two active
    // packages with the same amount would make one of them unreachable.
    if (active && credits != null) {
      const other = activeByCredits.get(credits);
      if (other) {
        ctx.fail(`${base}.credits`, `"${other}" already sells ${credits.toLocaleString('en-US')} credits. Active packages need different amounts.`);
      } else {
        activeByCredits.set(credits, name || 'Another package');
      }
    }
    packages.push({ id, name, credits, pricePhp, active });
  });
  return packages;
}

function normalizeEconomy(patch, current, ctx) {
  const rules = SETTINGS_RULES.economy;
  const defaults = DEFAULT_SETTINGS.economy;

  const creditValuePhp = readNumber(pick(patch, current, 'creditValuePhp'), 'creditValuePhp', ctx, rules.creditValuePhp);
  const creditPackages = normalizePackages(pick(patch, current, 'creditPackages'), ctx);

  const mpPatch = isPlainObject(patch.marketplaceSettings) ? patch.marketplaceSettings : {};
  const mpCurrent = isPlainObject(current?.marketplaceSettings) ? current.marketplaceSettings : defaults.marketplaceSettings;
  const marketplaceSettings = {
    listingFeeCredits: readNumber(pick(mpPatch, mpCurrent, 'listingFeeCredits'), 'marketplaceSettings.listingFeeCredits', ctx, rules.listingFeeCredits),
    transactionFeePercent: readNumber(pick(mpPatch, mpCurrent, 'transactionFeePercent'), 'marketplaceSettings.transactionFeePercent', ctx, rules.transactionFeePercent),
    minPayoutCredits: readNumber(pick(mpPatch, mpCurrent, 'minPayoutCredits'), 'marketplaceSettings.minPayoutCredits', ctx, rules.minPayoutCredits),
    refundWindowDays: readNumber(pick(mpPatch, mpCurrent, 'refundWindowDays'), 'marketplaceSettings.refundWindowDays', ctx, rules.refundWindowDays),
  };

  const patchFees = Array.isArray(patch.feeSettings) ? patch.feeSettings.filter(isPlainObject) : [];
  const patchFeeById = new Map(patchFees.map((fee) => [fee.id, fee]));
  const currentFeeById = new Map((current?.feeSettings || []).filter(isPlainObject).map((fee) => [fee.id, fee]));

  // Labels and descriptions come from the catalog; only the charged amounts are editable.
  const feeSettings = defaults.feeSettings.map((catalogFee) => {
    const usage = FEE_USAGE[catalogFee.id] || { mode: 'unused' };
    const stored = currentFeeById.get(catalogFee.id) || catalogFee;
    const sent = patchFeeById.get(catalogFee.id) || {};
    const base = `feeSettings.${catalogFee.id}`;

    let percent = Number(stored.percent) || 0;
    let flatFee = Number(stored.flatFee) || 0;
    if (usage.percent) {
      percent = readNumber(sent.percent !== undefined ? sent.percent : stored.percent, `${base}.percent`, ctx, rules.feePercent);
    }
    if (usage.flat) {
      flatFee = readNumber(sent.flatFee !== undefined ? sent.flatFee : stored.flatFee, `${base}.flatFee`, ctx, rules.feeFlat);
    }
    if (usage.mode === 'linked' && marketplaceSettings.transactionFeePercent != null) {
      percent = marketplaceSettings.transactionFeePercent;
    }
    return { ...catalogFee, percent, flatFee };
  });

  return { creditValuePhp, creditPackages, feeSettings, marketplaceSettings };
}

function normalizeSecurity(patch, current, ctx, context) {
  const rules = SETTINGS_RULES.security;

  const rawIps = pick(patch, current, 'allowedAdminIps');
  const entries = Array.isArray(rawIps)
    ? rawIps
    : typeof rawIps === 'string'
      ? rawIps.split(',')
      : [];
  const invalid = [];
  const allowedAdminIps = [];
  const seen = new Set();
  for (const entry of entries) {
    const text = String(entry ?? '').trim();
    if (!text) continue;
    const canonical = canonicalAllowlistEntry(text);
    if (!canonical) {
      invalid.push(text);
    } else if (!seen.has(canonical)) {
      seen.add(canonical);
      allowedAdminIps.push(canonical);
    }
  }
  if (invalid.length) {
    const shown = invalid.slice(0, 3).map((value) => `"${value.slice(0, 64)}"`).join(', ');
    ctx.fail('allowedAdminIps', `Not a valid IP address or CIDR range: ${shown}${invalid.length > 3 ? '…' : ''}`);
  } else if (allowedAdminIps.length > rules.maxAllowedAdminIps) {
    ctx.fail('allowedAdminIps', `Keep ${rules.maxAllowedAdminIps} entries or fewer. Use CIDR ranges to cover a network.`);
  }

  const ipAllowlistEnabled = readBoolean(pick(patch, current, 'ipAllowlistEnabled'), 'ipAllowlistEnabled', ctx);
  if (ipAllowlistEnabled && !invalid.length) {
    const requesterIp = normalizeIp(context.requesterIp);
    if (!allowedAdminIps.length) {
      ctx.fail('ipAllowlistEnabled', 'Add at least one address before turning on the allowlist.');
    } else if (requesterIp && !ipMatchesAllowlist(requesterIp, allowedAdminIps)) {
      ctx.fail('allowedAdminIps', `Your current IP (${requesterIp}) is not on the list. Add it first, or this save would lock you out of the admin console.`);
    }
  }

  const requireStaff2fa = readBoolean(pick(patch, current, 'requireStaff2fa'), 'requireStaff2fa', ctx);
  if (requireStaff2fa && !current?.requireStaff2fa && !emailDeliveryConfigured()) {
    const withoutApp = (context.staff || []).filter((member) => !member.hasAuthenticator).length;
    if (withoutApp > 0) {
      ctx.fail(
        'requireStaff2fa',
        `${withoutApp} staff account${withoutApp === 1 ? ' has' : 's have'} no authenticator app, and this server cannot send email, so ${withoutApp === 1 ? 'it' : 'they'} could not receive sign-in codes.`
      );
    }
  }

  return {
    requireStaff2fa,
    minPasswordLength: readNumber(pick(patch, current, 'minPasswordLength'), 'minPasswordLength', ctx, rules.minPasswordLength),
    lockoutAfterFailedAttempts: readNumber(pick(patch, current, 'lockoutAfterFailedAttempts'), 'lockoutAfterFailedAttempts', ctx, rules.lockoutAfterFailedAttempts),
    lockoutDurationMinutes: readNumber(pick(patch, current, 'lockoutDurationMinutes'), 'lockoutDurationMinutes', ctx, rules.lockoutDurationMinutes),
    auditLogRetentionDays: readNumber(pick(patch, current, 'auditLogRetentionDays'), 'auditLogRetentionDays', ctx, rules.auditLogRetentionDays),
    ipAllowlistEnabled,
    allowedAdminIps,
  };
}

const NORMALIZERS = {
  platform: normalizePlatform,
  economy: normalizeEconomy,
  security: normalizeSecurity,
};

// ---------------------------------------------------------------------------
// Change diff for the audit log.
// ---------------------------------------------------------------------------

const MAX_AUDITED_CHANGES = 40;
const IGNORED_DIFF_KEYS = new Set(['salesCount', 'sessionTimeoutMinutes']);
const ITEM_FIELD_LABELS = {
  name: 'name',
  credits: 'credits',
  pricePhp: 'price (PHP)',
  active: 'active',
  percent: 'percent',
  flatFee: 'flat fee',
};

function describeValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function fieldLabel(section, path) {
  const meta = FIELD_META[`${section}.${path}`];
  if (meta?.name) return meta.name;
  const leaf = path.split('.').pop() || path;
  return leaf.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

function diffItemsById(changes, { field, label, before, after, fields }) {
  const prev = new Map((Array.isArray(before) ? before : []).filter(isPlainObject).map((item) => [item.id, item]));
  const next = new Map((Array.isArray(after) ? after : []).filter(isPlainObject).map((item) => [item.id, item]));
  const nameOf = (item) => item?.name || item?.label || item?.id;

  for (const [id, item] of prev) {
    if (!next.has(id)) changes.push({ field, label: `${label}: ${nameOf(item)}`, from: 'Listed', to: 'Removed' });
  }
  for (const [id, item] of next) {
    const old = prev.get(id);
    if (!old) {
      const summary = item.credits != null ? `${item.credits} credits for ₱${item.pricePhp}` : 'Added';
      changes.push({ field, label: `${label}: ${nameOf(item)}`, from: '—', to: `Added (${summary})` });
      continue;
    }
    for (const key of fields) {
      if (old[key] !== item[key]) {
        changes.push({
          field,
          label: `${label}: ${nameOf(item)} ${ITEM_FIELD_LABELS[key] || key}`,
          from: describeValue(old[key]),
          to: describeValue(item[key]),
        });
      }
    }
  }
}

function diffSection(section, before, after) {
  const changes = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  for (const key of keys) {
    if (IGNORED_DIFF_KEYS.has(key)) continue;
    const a = before?.[key];
    const b = after?.[key];
    const field = `${section}.${key}`;

    if (key === 'creditPackages') {
      diffItemsById(changes, { field, label: 'Package', before: a, after: b, fields: ['name', 'credits', 'pricePhp', 'active'] });
    } else if (key === 'feeSettings') {
      diffItemsById(changes, { field, label: 'Fee', before: a, after: b, fields: ['percent', 'flatFee'] });
    } else if (isPlainObject(a) || isPlainObject(b)) {
      for (const sub of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
        if (a?.[sub] !== b?.[sub]) {
          changes.push({
            field: `${field}.${sub}`,
            label: fieldLabel(section, `${key}.${sub}`),
            from: describeValue(a?.[sub]),
            to: describeValue(b?.[sub]),
          });
        }
      }
    } else if (Array.isArray(a) || Array.isArray(b)) {
      if (JSON.stringify(a || []) !== JSON.stringify(b || [])) {
        changes.push({ field, label: fieldLabel(section, key), from: describeValue(a || []), to: describeValue(b || []) });
      }
    } else if (a !== b) {
      changes.push({ field, label: fieldLabel(section, key), from: describeValue(a), to: describeValue(b) });
    }
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function buildSettingsAlerts(sections, { staff }) {
  const alerts = [];
  const platform = sections.platform?.value || {};
  const security = sections.security?.value || {};
  const economy = sections.economy?.value || {};

  if (platform.maintenanceMode) {
    alerts.push({
      id: 'maintenance',
      tab: 'platform',
      severity: 'warning',
      message: 'Maintenance mode is on. Members cannot sign in or use the app; landing pages and staff consoles stay up.',
    });
  }
  if (platform.registrationEnabled === false) {
    alerts.push({ id: 'registration-off', tab: 'platform', severity: 'warning', message: 'New sign-ups are closed.' });
  }
  if (security.requireStaff2fa) {
    const withoutApp = staff.filter((member) => !member.hasAuthenticator).length;
    if (withoutApp && !emailDeliveryConfigured()) {
      alerts.push({
        id: '2fa-no-email',
        tab: 'security',
        severity: 'warning',
        message: `Staff 2FA is required, but this server cannot send email. ${withoutApp} staff without an authenticator app cannot sign in.`,
      });
    }
  }
  if (security.ipAllowlistEnabled && !(security.allowedAdminIps || []).length) {
    alerts.push({
      id: 'ip-allowlist-empty',
      tab: 'security',
      severity: 'warning',
      message: 'The admin IP allowlist is on but empty, so it does not restrict anything.',
    });
  }
  const activePackages = (economy.creditPackages || []).filter((pkg) => pkg.active !== false);
  if (!activePackages.length) {
    alerts.push({
      id: 'no-packages',
      tab: 'economy',
      severity: 'warning',
      message: 'No credit package is active. Members can only buy a custom amount.',
    });
  }
  return alerts;
}

function attachPackageSales(sections, sales) {
  const key = (credits, price) => `${Number(credits)}:${Number(price).toFixed(2)}`;
  const byKey = new Map(sales.map((row) => [key(row.credits, row.pricePhp), row.sales]));
  const economy = sections.economy?.value;
  if (!economy || !Array.isArray(economy.creditPackages)) return;
  economy.creditPackages = economy.creditPackages.map((pkg) => ({
    ...pkg,
    salesCount: byKey.get(key(pkg.credits, pkg.pricePhp)) || 0,
  }));
}

async function getAdminSettingsOverview({ requesterIp = null } = {}) {
  const [sections, staff, changeHistory, sales] = await Promise.all([
    loadAllSettingsSections(),
    listSettingsStaff().catch((err) => {
      console.error('Settings overview: staff list failed:', err.message);
      return [];
    }),
    listSettingsChangeHistory().catch((err) => {
      console.error('Settings overview: change history failed:', err.message);
      return [];
    }),
    countPaidTopupsByCreditsAndPrice().catch((err) => {
      console.error('Settings overview: package sales failed:', err.message);
      return [];
    }),
  ]);

  attachPackageSales(sections, sales);

  return {
    lastUpdated: new Date().toISOString(),
    sections,
    defaults: DEFAULT_SETTINGS,
    rules: SETTINGS_RULES,
    feeUsage: FEE_USAGE,
    staff,
    changeHistory,
    alerts: buildSettingsAlerts(sections, { staff }),
    viewer: { ip: normalizeIp(requesterIp) || null },
    delivery: { email: emailDeliveryConfigured() },
    propagationSeconds: Math.ceil(SECTION_CACHE_TTL_MS / 1000),
  };
}

/**
 * Validate and save one settings section.
 *
 * `values` may be the whole section or only the fields being changed; it is merged over
 * the stored section while that section is locked. `baseVersion` (from the overview) makes
 * the save fail with 409 when someone else saved the section in between.
 */
async function updateAdminSettingsSection({ section, values, baseVersion = null, session = null, requesterIp = null }) {
  if (!SECTION_KEYS.includes(section)) {
    throw new SettingsServiceError('Unknown settings section.', 400, { code: 'UNKNOWN_SECTION' });
  }
  if (!isPlainObject(values)) {
    throw new SettingsServiceError('Settings values must be an object.', 400, { code: 'INVALID_BODY' });
  }
  if (baseVersion != null && (typeof baseVersion !== 'string' || !/^[a-f0-9]{16}$/.test(baseVersion))) {
    throw new SettingsServiceError('Invalid settings version.', 400, { code: 'INVALID_BODY' });
  }

  const [actor, staff] = await Promise.all([
    resolveStaffForSession(session).catch(() => null),
    section === 'security' ? listSettingsStaff() : Promise.resolve([]),
  ]);
  const context = { requesterIp, staff };

  let result;
  try {
    result = await writeSettingsSection(section, {
      baseVersion,
      buildNextValue: (current) => {
        const ctx = makeContext();
        const value = NORMALIZERS[section](values, current, ctx, context);
        if (Object.keys(ctx.errors).length) {
          throw new SettingsServiceError('Some settings need attention before they can be saved.', 400, {
            code: 'SETTINGS_INVALID',
            errors: ctx.errors,
          });
        }
        return { value, changes: diffSection(section, current, value) };
      },
      afterWrite: async (client, { changes }) => {
        if (!actor?.account_id || !changes.length) return;
        // A failed insert would abort the transaction and turn COMMIT into ROLLBACK,
        // so the audit row gets its own savepoint.
        await client.query('SAVEPOINT settings_audit');
        const row = await recordAccountActivity({
          client,
          accountId: actor.account_id,
          action: `Updated ${SECTION_LABELS[section]} settings`,
          eventCode: SETTINGS_EVENT_CODE,
          referenceTable: 'configuration',
          referenceId: section,
          actorStaffId: actor.staff_id,
          metadata: {
            section,
            changeCount: changes.length,
            changes: changes.slice(0, MAX_AUDITED_CHANGES),
          },
        });
        await client.query(row ? 'RELEASE SAVEPOINT settings_audit' : 'ROLLBACK TO SAVEPOINT settings_audit');
      },
    });
  } catch (err) {
    if (err.code === 'SETTINGS_VERSION_CONFLICT') {
      throw new SettingsServiceError(
        `${SECTION_LABELS[section]} settings were saved by someone else after you opened them. Reload to see the latest values, then reapply your edits.`,
        409,
        { code: err.code }
      );
    }
    throw err;
  }

  const overview = await getAdminSettingsOverview({ requesterIp });
  return { overview, changed: result.changed, changes: result.changes };
}

module.exports = {
  SettingsServiceError,
  SETTINGS_RULES,
  FEE_USAGE,
  getAdminSettingsOverview,
  updateAdminSettingsSection,
  diffSection,
};
