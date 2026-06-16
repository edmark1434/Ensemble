export type ModerationCase = {
  id: string;
  type: string;
  priority: string;
  target: string;
  targetHandle: string;
  targetType: string;
  reason: string;
  assignedRole: string;
  openedAt: string | null;
  status: string;
};

export type ModerationActivity = {
  id: string;
  action: string;
  category: string;
  target: string;
  targetHandle: string;
  targetType: string;
  executedBy: string;
  executedByRole: string;
  executedByHandle: string;
  timestamp: string | null;
  status: string;
  notes: string;
};

export type ModeratorProfile = {
  id: number;
  name: string;
  role: string;
  handle: string;
  email: string;
  status: string;
  actionsHandled: number;
  performanceScore: number;
  active: boolean;
};

export type ForumReviewItem = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  status: string;
  tags: string[];
  createdAt: string | null;
  deletedAt: string | null;
};

export type ContentSnapshot = {
  id: string;
  groupId: string | null;
  title: string;
  commentCount: number;
  userId: number | null;
  createdAt: string | null;
};

export type ModerationAlert = {
  id: string;
  message: string;
  severity: 'warning' | 'error' | 'info' | 'success';
};

export type ModerationOverview = {
  lastUpdated: string;
  dataSources: {
    postgres: { tables: string[]; accountCount: number; userCount: number; staffCount: number };
    mongo: { connected: boolean; collections: string[]; forumGroups: number; discussions: number };
    notYetInDatabase: string[];
  };
  summary: {
    yourPendingCases: number;
    moderatorPerformancePercent: number;
    activeModerators: number;
    totalModerators: number;
    openIdentityReviews: number;
    nonActiveAccounts: number;
    softDeletedAccounts: number;
    forumGroupsActive: number;
    forumDiscussions: number;
    disputeQueueCount: number;
  };
  pendingCases: ModerationCase[];
  recentActivity: ModerationActivity[];
  moderatorRoster: ModeratorProfile[];
  accountStatusBreakdown: { status: string; count: number }[];
  forumReviewQueue: ForumReviewItem[];
  contentSnapshots: ContentSnapshot[];
  automatedSettings: {
    spamFilterEnabled: boolean;
    autoFlagProfanity: boolean;
    autoHoldNewAccounts: boolean;
    maxWarningsBeforeSuspend: number;
    forumLinkScanning: boolean;
    marketplaceListingReview: boolean;
    disputeAutoAssign: boolean;
  };
  alerts: ModerationAlert[];
};
