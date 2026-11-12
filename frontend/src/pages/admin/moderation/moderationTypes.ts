export type ModerationCase = {
  id: string;
  source?: 'report' | 'dispute' | 'listing' | 'identity' | string;
  type: string;
  priority: string;
  target: string;
  targetHandle: string;
  targetType: string;
  reason: string;
  description?: string | null;
  referenceNumber?: string | null;
  accountId?: string | null;
  verificationStatus?: string | null;
  assignedRole?: string | null;
  assignedStaffId?: string | number | null;
  assignedStaffName?: string | null;
  openedAt: string | null;
  status: string;
  canAssignMyself?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};

/** One metadata field of an activity entry, already labelled by the backend. */
export type ActivityDetail = {
  key: string;
  label: string;
  value: string | number | boolean | null;
  type: 'string' | 'number' | 'boolean' | 'date' | 'id' | 'text';
};

export type ActivityReversal = {
  reversed: boolean;
  at?: string | null;
  by?: string | null;
  byRole?: string | null;
  byStaffId?: string | null;
  note?: string | null;
};

export type ModerationActivity = {
  id: string;
  action: string;
  category: string;
  categoryLabel?: string;
  eventCode?: string;
  eventLabel?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info' | string;
  impact?: string | null;

  target: string;
  targetHandle: string;
  targetType: string;
  accountId?: string | null;
  accountStatus?: string | null;

  executedBy: string;
  executedByRole: string;
  executedByHandle: string;
  executedByKind?: 'Staff' | 'Member' | 'System' | string;
  executedByStaffId?: string | null;
  executedByAccountId?: string | null;

  timestamp: string | null;
  status: string;

  reason?: string | null;
  notes: string;
  details?: ActivityDetail[];
  metadata?: Record<string, unknown>;

  reference?: {
    table?: string | null;
    prefix?: string | null;
    id?: string | null;
    label?: string | null;
  };
  referenceTable?: string | null;
  referenceId?: string | null;

  reversible?: boolean;
  reversal?: ActivityReversal;
};

export type ActivityFilterOption = { value: string; label: string; count?: number };

/** `GET /api/admin/moderation/activity` */
export type ModerationActivityPage = {
  entries: ModerationActivity[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  stats: {
    total: number;
    reversed: number;
    accounts: number;
    actors: number;
    last24h: number;
    last7d: number;
    oldest: string | null;
    newest: string | null;
  };
  filters: {
    categories: ActivityFilterOption[];
    eventCodes: ActivityFilterOption[];
    roles: ActivityFilterOption[];
  };
};

export type ModeratorProfile = {
  id: string | number;
  accountId?: string;
  firstName?: string;
  lastName?: string;
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
    openReports?: number;
    pendingListings?: number;
    activeViolations?: number;
  };
  currentStaffId?: string | number | null;
  pendingCases: ModerationCase[];
  /** Full dispute desk list (Pending cases → Disputes) */
  disputes?: import('../ticketManagement/ticketTypes').Dispute[];
  /** Full user reports list (Pending cases → Reports) */
  reports?: import('../ticketManagement/ticketTypes').UserReport[];
  recentActivity: ModerationActivity[];
  moderatorRoster: ModeratorProfile[];
  accountStatusBreakdown: { status: string; count: number }[];
  forumReviewQueue: ForumReviewItem[];
  contentSnapshots: ContentSnapshot[];
  automatedSettings: Record<string, never>;
  forumMongoConnected?: boolean;
  alerts: ModerationAlert[];
};
