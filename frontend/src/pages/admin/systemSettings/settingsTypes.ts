export type SettingsTabId = 'platform' | 'economy' | 'security';

export type SettingsSection<T> = {
  key: string;
  value: T;
  updatedAt: string | null;
  isDefault: boolean;
  /** Fingerprint of the stored values; sent back on save to detect conflicting edits. */
  version?: string;
};

export type PlatformSettings = {
  siteName: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  supportEmail: string;
  sessionTimeoutDays: number;
  sessionTimeoutMinutes?: number;
};

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  pricePhp: number;
  active: boolean;
  /** Paid top-ups at this package's credits and price (computed by the server, read-only). */
  salesCount?: number;
};

export type FeeSetting = {
  id: string;
  label: string;
  percent: number;
  flatFee: number;
  appliesTo: string;
  paidBy?: string;
  reason?: string;
};

export type FeeUsage = {
  mode: 'commission' | 'flat' | 'linked' | 'unused';
  percent: boolean;
  flat: boolean;
  note: string;
};

export type MarketplaceSettings = {
  listingFeeCredits: number;
  transactionFeePercent: number;
  minPayoutCredits: number;
  refundWindowDays: number;
};

export type EconomySettings = {
  /** Philippine pesos per 1 platform credit. Default 1. */
  creditValuePhp: number;
  creditPackages: CreditPackage[];
  feeSettings: FeeSetting[];
  marketplaceSettings: MarketplaceSettings;
};

export type SecuritySettings = {
  requireStaff2fa: boolean;
  minPasswordLength: number;
  lockoutAfterFailedAttempts: number;
  lockoutDurationMinutes: number;
  auditLogRetentionDays: number;
  ipAllowlistEnabled: boolean;
  allowedAdminIps: string[];
};

export type NumberRule = { min: number; max: number; integer?: boolean; decimals?: number };
export type TextRule = { min?: number; max: number };

export type SettingsRules = {
  platform: {
    siteName: TextRule;
    supportEmail: TextRule;
    sessionTimeoutDays: NumberRule;
  };
  economy: {
    creditValuePhp: NumberRule;
    maxPackages: number;
    packageName: TextRule;
    packageCredits: NumberRule;
    packagePricePhp: NumberRule;
    feePercent: NumberRule;
    feeFlat: NumberRule;
    listingFeeCredits: NumberRule;
    transactionFeePercent: NumberRule;
    minPayoutCredits: NumberRule;
    refundWindowDays: NumberRule;
  };
  security: {
    minPasswordLength: NumberRule;
    lockoutAfterFailedAttempts: NumberRule;
    lockoutDurationMinutes: NumberRule;
    auditLogRetentionDays: NumberRule;
    maxAllowedAdminIps: number;
  };
};

export type SettingsChange = { field?: string; label: string; from: string; to: string };

export type SettingsHistoryEntry = {
  id: string;
  section: string;
  updatedAt: string;
  updatedBy: string;
  actorRole?: string | null;
  changes?: SettingsChange[];
  changeCount?: number;
};

export type SettingsStaffMember = {
  staffId: string | number;
  name: string;
  handle?: string | null;
  role: string;
  hasAuthenticator?: boolean;
};

export type SettingsAlert = {
  id: string;
  message: string;
  severity: 'warning' | 'info' | string;
  tab?: SettingsTabId;
};

export type SettingsDrafts = {
  platform: PlatformSettings;
  economy: EconomySettings;
  security: SecuritySettings;
};

export type SettingsOverview = {
  lastUpdated: string;
  sections: {
    platform: SettingsSection<PlatformSettings>;
    economy: SettingsSection<EconomySettings>;
    security: SettingsSection<SecuritySettings>;
  };
  defaults?: SettingsDrafts;
  rules?: SettingsRules;
  feeUsage?: Record<string, FeeUsage>;
  staff?: SettingsStaffMember[];
  changeHistory: SettingsHistoryEntry[];
  alerts: SettingsAlert[];
  viewer?: { ip: string | null };
  delivery?: { email: boolean };
  propagationSeconds?: number;
};

/** Field-level messages keyed by path, e.g. `sessionTimeoutDays` or `creditPackages.pkg-pro.pricePhp`. */
export type FieldErrors = Record<string, string>;
