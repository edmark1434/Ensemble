export type SettingsSection<T> = {
  key: string;
  value: T;
  updatedAt: string | null;
  isDefault: boolean;
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
  salesCount: number;
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

export type EconomySettings = {
  /** Philippine pesos per 1 platform credit. Default 1. */
  creditValuePhp: number;
  creditPackages: CreditPackage[];
  feeSettings: FeeSetting[];
  marketplaceSettings: {
    listingFeeCredits: number;
    transactionFeePercent: number;
    minPayoutCredits: number;
    refundWindowDays: number;
  };
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

export type SettingsOverview = {
  lastUpdated: string;
  sections: {
    platform: SettingsSection<PlatformSettings>;
    economy: SettingsSection<EconomySettings>;
    security: SettingsSection<SecuritySettings>;
  };
  staffEditors: { staffId: string | number; name: string; role: string }[];
  changeHistory: { id: string; section: string; updatedAt: string; updatedBy: string }[];
  alerts: { id: string; message: string; severity: string }[];
  dataSources: { persisted: string[]; tables: string[] };
};
