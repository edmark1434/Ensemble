export type SettingsSection<T> = {
  key: string;
  value: T;
  updatedAt: string | null;
  isDefault: boolean;
};

export type PlatformSettings = {
  siteName: string;
  tagline: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  defaultUserMerit: number;
  supportEmail: string;
  maxUploadMb: number;
  sessionTimeoutMinutes: number;
};

export type ModerationSettings = {
  spamFilterEnabled: boolean;
  autoFlagProfanity: boolean;
  autoHoldNewAccounts: boolean;
  forumLinkScanning: boolean;
  marketplaceListingReview: boolean;
  disputeAutoAssign: boolean;
  maxWarningsBeforeSuspend: number;
  autoEscalateHighPriority: boolean;
  reportToTicketAutoCreate: boolean;
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
  creditPackages: CreditPackage[];
  feeSettings: FeeSetting[];
  marketplaceSettings: {
    listingFeeCredits: number;
    transactionFeePercent: number;
    escrowHoldDays: number;
    minPayoutCredits: number;
    refundWindowDays: number;
  };
};

export type NotificationSettings = {
  emailNewSignups: boolean;
  emailNewTickets: boolean;
  emailDisputeOpened: boolean;
  emailHighPriorityReports: boolean;
  emailWeeklyDigest: boolean;
  slackWebhookEnabled: boolean;
  slackWebhookUrl: string;
  notifyAssigneeOnTicket: boolean;
  notifyRequesterOnResolution: boolean;
};

export type SecuritySettings = {
  requireStaff2fa: boolean;
  minPasswordLength: number;
  lockoutAfterFailedAttempts: number;
  lockoutDurationMinutes: number;
  auditLogRetentionDays: number;
  ipAllowlistEnabled: boolean;
  allowedAdminIps: string[];
  forceHttps: boolean;
};

export type SettingsOverview = {
  lastUpdated: string;
  sections: {
    platform: SettingsSection<PlatformSettings>;
    moderation: SettingsSection<ModerationSettings>;
    economy: SettingsSection<EconomySettings>;
    notifications: SettingsSection<NotificationSettings>;
    security: SettingsSection<SecuritySettings>;
  };
  staffEditors: { staffId: string | number; name: string; role: string }[];
  changeHistory: { id: string; section: string; updatedAt: string; updatedBy: string }[];
  alerts: { id: string; message: string; severity: string }[];
  dataSources: { persisted: string[]; tables: string[] };
};
