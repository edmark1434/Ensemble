import type {
  EconomySettings,
  FeeUsage,
  FieldErrors,
  NumberRule,
  PlatformSettings,
  SecuritySettings,
  SettingsDrafts,
  SettingsOverview,
  SettingsRules,
  SettingsTabId,
  TextRule,
} from './settingsTypes';

/** Used only when an older API does not send `rules`; the backend stays authoritative. */
export const FALLBACK_RULES: SettingsRules = {
  platform: {
    siteName: { min: 1, max: 60 },
    supportEmail: { max: 254 },
    sessionTimeoutDays: { min: 1, max: 30, integer: true },
  },
  economy: {
    creditValuePhp: { min: 0.01, max: 1000, decimals: 4 },
    maxPackages: 24,
    packageName: { min: 1, max: 40 },
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
    minPasswordLength: { min: 8, max: 64, integer: true },
    lockoutAfterFailedAttempts: { min: 3, max: 20, integer: true },
    lockoutDurationMinutes: { min: 5, max: 1440, integer: true },
    auditLogRetentionDays: { min: 30, max: 1825, integer: true },
    maxAllowedAdminIps: 50,
  },
};

export const FALLBACK_FEE_USAGE: Record<string, FeeUsage> = {
  'fee-job': { mode: 'commission', percent: true, flat: true, note: 'Deducted from each milestone payment released on a job contract.' },
  'fee-gig': { mode: 'commission', percent: true, flat: true, note: 'Deducted from each milestone payment released on a gig order.' },
  'fee-cashout': { mode: 'commission', percent: true, flat: false, note: 'Percent of each cashout.' },
  'fee-marketplace': { mode: 'linked', percent: false, flat: false, note: 'Uses the marketplace transaction fee under Marketplace rules.' },
  'fee-job-post': { mode: 'flat', percent: false, flat: true, note: 'Charged when a client publishes a job.' },
  'fee-gig-create': { mode: 'flat', percent: false, flat: true, note: 'Charged when a freelancer publishes a gig.' },
  'fee-asset-upload': { mode: 'flat', percent: false, flat: true, note: 'Charged to list an asset only while the marketplace listing fee is 0.' },
};

export const SECTION_LABELS: Record<SettingsTabId, string> = {
  platform: 'Platform',
  economy: 'Economy',
  security: 'Security',
};

export function rulesOf(data: SettingsOverview | null): SettingsRules {
  return data?.rules ?? FALLBACK_RULES;
}

export function feeUsageOf(data: SettingsOverview | null): Record<string, FeeUsage> {
  return data?.feeUsage ?? FALLBACK_FEE_USAGE;
}

// ---------------------------------------------------------------------------
// Drafts
// ---------------------------------------------------------------------------

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function draftsFrom(data: SettingsOverview): SettingsDrafts {
  const platform = clone(data.sections.platform.value);
  if (platform.sessionTimeoutDays == null && platform.sessionTimeoutMinutes != null) {
    platform.sessionTimeoutDays = Math.max(1, Math.round(platform.sessionTimeoutMinutes / 1440));
  }
  const security = clone(data.sections.security.value);
  security.allowedAdminIps = [...(security.allowedAdminIps || [])];
  return { platform, economy: clone(data.sections.economy.value), security };
}

/** Keys that the server derives or keeps for legacy clients; they never count as edits. */
const DERIVED_KEYS = new Set(['salesCount', 'sessionTimeoutMinutes']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasId(value: unknown): value is { id: string } {
  return isRecord(value) && typeof value.id === 'string';
}

/** Number of individual edits between two values (array items matched by id). */
export function countChanges(a: unknown, b: unknown): number {
  if (Object.is(a, b)) return 0;
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return 0;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.every(hasId) && b.every(hasId)) {
      const before = new Map(a.map((item) => [item.id, item]));
      const after = new Map(b.map((item) => [item.id, item]));
      let n = 0;
      for (const [id, item] of before) n += after.has(id) ? countChanges(item, after.get(id)) : 1;
      for (const id of after.keys()) if (!before.has(id)) n += 1;
      return n;
    }
    return JSON.stringify(a) === JSON.stringify(b) ? 0 : 1;
  }
  if (isRecord(a) && isRecord(b)) {
    let n = 0;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (DERIVED_KEYS.has(key)) continue;
      n += countChanges(a[key], b[key]);
    }
    return n;
  }
  return 1;
}

// ---------------------------------------------------------------------------
// Validation (mirrors backend/services/AdminSettingsServices.js)
// ---------------------------------------------------------------------------

function formatBound(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export function numberError(value: unknown, rule: NumberRule): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Enter a number.';
  if (rule.integer && !Number.isInteger(value)) return 'Enter a whole number.';
  if (value < rule.min || value > rule.max) return `Enter a value from ${formatBound(rule.min)} to ${formatBound(rule.max)}.`;
  if (rule.decimals != null) {
    const factor = 10 ** rule.decimals;
    if (Math.abs(Math.round(value * factor) - value * factor) > 1e-6) {
      return `Use at most ${rule.decimals} decimal place${rule.decimals === 1 ? '' : 's'}.`;
    }
  }
  return null;
}

function textError(value: unknown, rule: TextRule): string | null {
  if (typeof value !== 'string') return 'Enter text.';
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length < (rule.min ?? 0)) return 'Required.';
  if (text.length > rule.max) return `Use ${rule.max} characters or fewer.`;
  return null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function put(errors: FieldErrors, path: string, message: string | null) {
  if (message && !errors[path]) errors[path] = message;
}

export function validatePlatform(value: PlatformSettings, rules: SettingsRules): FieldErrors {
  const r = rules.platform;
  const errors: FieldErrors = {};
  put(errors, 'siteName', textError(value.siteName, { min: 1, ...r.siteName }));
  const emailText = textError(value.supportEmail, { min: 1, max: r.supportEmail.max });
  put(errors, 'supportEmail', emailText || (EMAIL_PATTERN.test(value.supportEmail.trim()) ? null : 'Enter a valid email address.'));
  put(errors, 'sessionTimeoutDays', numberError(value.sessionTimeoutDays, r.sessionTimeoutDays));
  return errors;
}

export function validateEconomy(value: EconomySettings, rules: SettingsRules, feeUsage: Record<string, FeeUsage>): FieldErrors {
  const r = rules.economy;
  const errors: FieldErrors = {};
  put(errors, 'creditValuePhp', numberError(value.creditValuePhp, r.creditValuePhp));

  if (value.creditPackages.length > r.maxPackages) {
    put(errors, 'creditPackages', `Keep ${r.maxPackages} packages or fewer.`);
  }
  const activeByCredits = new Map<number, string>();
  for (const pkg of value.creditPackages) {
    const base = `creditPackages.${pkg.id}`;
    put(errors, `${base}.name`, textError(pkg.name, r.packageName));
    put(errors, `${base}.credits`, numberError(pkg.credits, r.packageCredits));
    put(errors, `${base}.pricePhp`, numberError(pkg.pricePhp, r.packagePricePhp));
    if (pkg.active && Number.isFinite(pkg.credits)) {
      const other = activeByCredits.get(pkg.credits);
      if (other) {
        put(errors, `${base}.credits`, `"${other}" already sells ${pkg.credits.toLocaleString('en-US')} credits. Active packages need different amounts.`);
      } else {
        activeByCredits.set(pkg.credits, pkg.name || 'Another package');
      }
    }
  }

  for (const fee of value.feeSettings) {
    const usage = feeUsage[fee.id];
    if (usage?.percent) put(errors, `feeSettings.${fee.id}.percent`, numberError(fee.percent, r.feePercent));
    if (usage?.flat) put(errors, `feeSettings.${fee.id}.flatFee`, numberError(fee.flatFee, r.feeFlat));
  }

  const mp = value.marketplaceSettings;
  put(errors, 'marketplaceSettings.listingFeeCredits', numberError(mp.listingFeeCredits, r.listingFeeCredits));
  put(errors, 'marketplaceSettings.transactionFeePercent', numberError(mp.transactionFeePercent, r.transactionFeePercent));
  put(errors, 'marketplaceSettings.minPayoutCredits', numberError(mp.minPayoutCredits, r.minPayoutCredits));
  put(errors, 'marketplaceSettings.refundWindowDays', numberError(mp.refundWindowDays, r.refundWindowDays));
  return errors;
}

// --- IP allowlist ------------------------------------------------------------

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function isIpv6(value: string) {
  if (!value.includes(':') || !/^[0-9a-f:.]+$/i.test(value)) return false;
  try {
    // The URL parser validates IPv6 literals.
    new URL(`http://[${value}]/`);
    return true;
  } catch {
    return false;
  }
}

export function normalizeIp(ip: string) {
  const trimmed = ip.trim();
  if (trimmed === '::1') return '127.0.0.1';
  if (trimmed.toLowerCase().startsWith('::ffff:') && IPV4.test(trimmed.slice(7))) return trimmed.slice(7);
  return trimmed;
}

/** Returns the canonical entry, or null when it is not an IP address or CIDR range. */
export function parseAllowlistEntry(entry: string): string | null {
  const raw = entry.trim();
  if (!raw) return null;
  const parts = raw.split('/');
  if (parts.length > 2) return null;
  const address = normalizeIp(parts[0]);
  const v4 = IPV4.test(address);
  if (!v4 && !isIpv6(address)) return null;
  if (parts.length === 1) return address;
  if (!/^\d{1,3}$/.test(parts[1])) return null;
  const prefix = Number(parts[1]);
  if (prefix > (v4 ? 32 : 128)) return null;
  return `${address}/${prefix}`;
}

function ipv4ToInt(ip: string) {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

/**
 * True / false when the browser can decide, null when only the server can (IPv6 ranges).
 * Used to warn before saving an allowlist that would lock the viewer out.
 */
export function viewerMatchesAllowlist(viewerIp: string | null | undefined, entries: string[]): boolean | null {
  if (!viewerIp) return null;
  const ip = normalizeIp(viewerIp);
  const viewerV4 = IPV4.test(ip);
  let undecided = false;
  for (const entry of entries) {
    const canonical = parseAllowlistEntry(entry);
    if (!canonical) continue;
    const [address, prefixText] = canonical.split('/');
    if (prefixText === undefined) {
      if (address.toLowerCase() === ip.toLowerCase()) return true;
      continue;
    }
    if (viewerV4 && IPV4.test(address)) {
      const prefix = Number(prefixText);
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      if ((ipv4ToInt(address) & mask) === (ipv4ToInt(ip) & mask)) return true;
    } else if (!viewerV4 && !IPV4.test(address)) {
      undecided = true;
    }
  }
  return undecided ? null : false;
}

export function validateSecurity(value: SecuritySettings, rules: SettingsRules, viewerIp: string | null | undefined): FieldErrors {
  const r = rules.security;
  const errors: FieldErrors = {};
  put(errors, 'minPasswordLength', numberError(value.minPasswordLength, r.minPasswordLength));
  put(errors, 'lockoutAfterFailedAttempts', numberError(value.lockoutAfterFailedAttempts, r.lockoutAfterFailedAttempts));
  put(errors, 'lockoutDurationMinutes', numberError(value.lockoutDurationMinutes, r.lockoutDurationMinutes));
  put(errors, 'auditLogRetentionDays', numberError(value.auditLogRetentionDays, r.auditLogRetentionDays));

  const invalid = value.allowedAdminIps.filter((entry) => !parseAllowlistEntry(entry));
  if (invalid.length) {
    put(errors, 'allowedAdminIps', `Not a valid IP address or CIDR range: ${invalid.slice(0, 3).map((v) => `"${v}"`).join(', ')}`);
  } else if (value.allowedAdminIps.length > r.maxAllowedAdminIps) {
    put(errors, 'allowedAdminIps', `Keep ${r.maxAllowedAdminIps} entries or fewer. Use CIDR ranges to cover a network.`);
  }
  if (value.ipAllowlistEnabled && !invalid.length) {
    if (!value.allowedAdminIps.length) {
      put(errors, 'ipAllowlistEnabled', 'Add at least one address before turning on the allowlist.');
    } else if (viewerMatchesAllowlist(viewerIp, value.allowedAdminIps) === false) {
      put(errors, 'allowedAdminIps', `Your current IP (${normalizeIp(viewerIp || '')}) is not on the list. Add it first, or this save would lock you out of the admin console.`);
    }
  }
  return errors;
}

export function validateSection(
  section: SettingsTabId,
  drafts: SettingsDrafts,
  data: SettingsOverview
): FieldErrors {
  const rules = rulesOf(data);
  if (section === 'platform') return validatePlatform(drafts.platform, rules);
  if (section === 'economy') return validateEconomy(drafts.economy, rules, feeUsageOf(data));
  return validateSecurity(drafts.security, rules, data.viewer?.ip);
}

// ---------------------------------------------------------------------------
// High-impact changes that need a confirmation before saving
// ---------------------------------------------------------------------------

export type SaveRisk = { id: string; title: string; detail: string; tone: 'danger' | 'caution' };

export function saveRisks(section: SettingsTabId, saved: SettingsDrafts, draft: SettingsDrafts, data: SettingsOverview): SaveRisk[] {
  const risks: SaveRisk[] = [];
  if (section === 'platform') {
    if (!saved.platform.maintenanceMode && draft.platform.maintenanceMode) {
      risks.push({
        id: 'maintenance',
        tone: 'danger',
        title: 'Turn on maintenance mode',
        detail: 'Members are blocked from signing in and using the app until you turn it off. Landing pages, webhooks and staff consoles stay up.',
      });
    }
    if (saved.platform.registrationEnabled && !draft.platform.registrationEnabled) {
      risks.push({ id: 'registration', tone: 'caution', title: 'Close sign-ups', detail: 'New members cannot create accounts. Existing members are not affected.' });
    }
    if (draft.platform.sessionTimeoutDays < saved.platform.sessionTimeoutDays) {
      risks.push({
        id: 'session',
        tone: 'caution',
        title: `Shorten sessions to ${draft.platform.sessionTimeoutDays} day${draft.platform.sessionTimeoutDays === 1 ? '' : 's'}`,
        detail: 'Signed-in members and staff who stay idle longer than this are signed out on their next visit.',
      });
    }
  }
  if (section === 'economy') {
    if (saved.economy.creditValuePhp !== draft.economy.creditValuePhp) {
      risks.push({
        id: 'credit-value',
        tone: 'danger',
        title: `Change credit value from ₱${saved.economy.creditValuePhp} to ₱${draft.economy.creditValuePhp}`,
        detail: 'Custom top-ups and every cashout conversion use the new rate immediately. Package prices stay as set.',
      });
    }
    const hadActive = saved.economy.creditPackages.some((p) => p.active);
    const hasActive = draft.economy.creditPackages.some((p) => p.active);
    if (hadActive && !hasActive) {
      risks.push({ id: 'no-packages', tone: 'caution', title: 'No active credit packages', detail: 'Members will only be able to buy a custom amount.' });
    }
    const feeChanges = countChanges(saved.economy.feeSettings, draft.economy.feeSettings)
      + countChanges(saved.economy.marketplaceSettings.transactionFeePercent, draft.economy.marketplaceSettings.transactionFeePercent);
    if (feeChanges > 0) {
      risks.push({ id: 'fees', tone: 'caution', title: 'Fee changes apply right away', detail: 'New charges use the new amounts within seconds. Past transactions are not recalculated.' });
    }
  }
  if (section === 'security') {
    if (!saved.security.requireStaff2fa && draft.security.requireStaff2fa) {
      const withoutApp = (data.staff || []).filter((s) => !s.hasAuthenticator).length;
      risks.push({
        id: '2fa',
        tone: 'caution',
        title: 'Require 2FA for all staff',
        detail: withoutApp
          ? `${withoutApp} staff account${withoutApp === 1 ? ' has' : 's have'} no authenticator app and will get a code by email at every sign-in.`
          : 'Every staff account already has an authenticator app.',
      });
    }
    const allowlistTouched =
      draft.security.ipAllowlistEnabled &&
      (!saved.security.ipAllowlistEnabled || countChanges(saved.security.allowedAdminIps, draft.security.allowedAdminIps) > 0);
    if (allowlistTouched) {
      const count = draft.security.allowedAdminIps.length;
      risks.push({
        id: 'allowlist',
        tone: 'danger',
        title: 'Restrict admin access by IP',
        detail: `Only ${count} listed address${count === 1 ? '' : 'es or ranges'} can open the admin console${data.viewer?.ip ? `. Your current IP ${data.viewer.ip} is included` : ''}.`,
      });
    }
  }
  return risks;
}
