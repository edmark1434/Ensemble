export type TicketPerson = {
  accountId?: number | string;
  userId?: number | string | null;
  name: string;
  username?: string;
  email?: string | null;
};

export type TicketAssignee = {
  staffId: number | string;
  name: string;
  role: string;
};

export type SupportTicket = {
  id: number | string;
  number: string;
  subject: string;
  reason?: string;
  type: string;
  /** @deprecated use type */
  category?: string;
  priority: string;
  status: string;
  requester: TicketPerson;
  assignee: TicketAssignee | null;
  escalatedBy?: TicketAssignee | null;
  /** Moderator queue this ticket was escalated TO */
  escalatedToRole?: string | null;
  isEscalated?: boolean;
  waitingForResponse?: boolean;
  isOverdue?: boolean;
  lastMessageAuthorType?: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  resolvedAt?: string | null;
};

export type TicketAttachment = {
  attachment_key?: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
};

export type TicketTimelineEntry = {
  id: string;
  kind: 'ticket' | 'account' | string;
  eventType: string;
  summary: string;
  actorName?: string | null;
  actorRole?: string | null;
  createdAt: string;
};

export type TicketArticle = {
  id: string;
  ticketType: string;
  title: string;
  body: string;
};

export type TicketPaymentEvidence = {
  payments: {
    id: string;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    type: string | null;
    credits: number;
    createdAt: string;
    processedAt: string | null;
  }[];
  credits: {
    id: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  }[];
  cashouts: {
    id: string;
    status: string;
    credits: number;
    channel: string | null;
    failureCode: string | null;
    accountLast4: string | null;
    createdAt: string;
    refundedAt: string | null;
  }[];
};

export type TicketMessage = {
  id: number | string;
  senderId?: string | null;
  authorType: string;
  authorName: string;
  authorRole?: string | null;
  body: string;
  attachments?: TicketAttachment[];
  isInternal: boolean;
  audience?: 'staff' | 'author_and_staff' | 'parties' | 'public' | string;
  publishedAt?: string | null;
  createdAt: string;
};

export type DisputeCreditHold = {
  transactionId: number | string | null;
  status: string;
  amount: number;
  type: string; // CREDIT_TRANSACTION.type, e.g. Escrow Hold
};

export type DisputePermissions = {
  staffId?: string | null;
  role?: string | null;
  isAssignee?: boolean;
  isAdmin?: boolean;
  canView?: boolean;
  canReply?: boolean;
  canAct?: boolean;
  canAssignOthers?: boolean;
  canSelfAssign?: boolean;
  canAssignMyself?: boolean;
  canRelease?: boolean;
};

export type TicketPermissions = {
  staffId?: string | null;
  role?: string | null;
  isAssignee?: boolean;
  isAdmin?: boolean;
  canView?: boolean;
  canAct?: boolean;
  canAssignOthers?: boolean;
  canSelfAssign?: boolean;
  canAssignMyself?: boolean;
  canRelease?: boolean;
  canEscalate?: boolean;
};

export type Dispute = {
  id: number | string;
  number: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  visibility?: boolean;
  initiator: TicketPerson;
  respondent: TicketPerson;
  assignee: TicketAssignee | null;
  creditAmount: number;
  sanctionType?: string | null;
  relatedCreditTransactionId?: number | string | null;
  creditHold?: DisputeCreditHold | null;
  openedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  isClosed?: boolean;
};

export type UserReport = {
  id: number | string;
  number: string;
  reporter: TicketPerson;
  targetType: string;
  targetId: string | null;
  type: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: { staffId: number | string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type StaffWorkload = {
  staffId: number | string;
  name: string;
  role: string;
  openTickets: number;
  openDisputes: number;
  openReports: number;
  totalOpen: number;
};

export type TicketActivity = {
  id: string;
  type: string;
  ref: string;
  label: string;
  status: string;
  at: string;
};

export type ChartSegment = { label: string; value: number; color?: string };

export const TICKET_STATUS_OPTIONS = ['Open', 'In Progress', 'Escalated to Dev', 'Resolved', 'Closed'] as const;
export const TICKET_PRIORITY_OPTIONS = ['Low', 'Medium', 'High'] as const;

export const SUPPORT_SUBGROUPS: { label: string; types: readonly string[] }[] = [
  {
    label: 'Account',
    types: [
      'Sign-in and password',
      'Account compromised',
      'Identity verification',
      'Profile and settings',
      'Teams',
      'Delete account or export data',
    ],
  },
  {
    label: 'Billing',
    types: ['Subscriptions and plans', 'Credits and balance', 'Payouts and withdrawals', 'Charges and receipts'],
  },
  {
    label: 'Video Editing Platform',
    types: ['Editor problems', 'Export and rendering', 'Uploads and storage', 'Project files', 'Sharing and collaboration'],
  },
  {
    label: 'Messaging',
    types: ['Inbox, chat, and calls', 'Notifications and email'],
  },
  {
    label: 'Safety and appeals',
    types: ['Report a user', 'Copyright claim', 'Appeal an account penalty'],
  },
  { label: 'General', types: ['Other'] },
];

export const SUPPORT_TICKET_TYPES = SUPPORT_SUBGROUPS.flatMap((group) => group.types);

export const FORUM_TICKET_TYPES = [
  'Posts and replies',
  'Forum groups',
  'Report a post or member',
  'Appeal a forum action',
] as const;

export const MARKETPLACE_TICKET_TYPES = [
  'Seller verification',
  'Listing review',
  'Asset purchase and download',
  'File is wrong or broken',
  'Marketplace refunds',
  'Report a listing or seller',
  'Asset reviews',
  'Appeal a marketplace action',
] as const;

export const JOBS_TICKET_TYPES = [
  'Job and gig listings',
  'Proposals and hiring',
  'Contracts, milestones, and orders',
  'Delivery and disputes',
  'Cancellations and refunds',
  'Report a listing or user',
  'Gig reviews',
  'Appeal a jobs action',
] as const;

export const TICKET_TYPE_OPTIONS = [
  ...SUPPORT_TICKET_TYPES,
  ...FORUM_TICKET_TYPES,
  ...MARKETPLACE_TICKET_TYPES,
  ...JOBS_TICKET_TYPES,
] as const;

export const TICKET_TYPE_GROUPS: {
  label: string;
  types: readonly string[];
  subgroups?: { label: string; types: readonly string[] }[];
}[] = [
  { label: 'Support', types: SUPPORT_TICKET_TYPES, subgroups: SUPPORT_SUBGROUPS },
  { label: 'Forums', types: FORUM_TICKET_TYPES },
  { label: 'Marketplace', types: MARKETPLACE_TICKET_TYPES },
  { label: 'Jobs and Gigs', types: JOBS_TICKET_TYPES },
];

export const TICKET_TYPE_DESCRIPTIONS: Record<string, string> = {
  'Sign-in and password': 'The member cannot sign in, reset their password, or stay logged in.',
  'Account compromised': 'Suspicious logins, unauthorized account changes, or two-factor authentication issues.',
  'Identity verification': 'The account identity check is pending, rejected, or unclear. This is different from seller verification.',
  'Profile and settings': 'Issues with the profile, photo, banner, email, or account settings.',
  Teams: 'Problems with team invitations, roles, removals, or suspended team memberships.',
  'Delete account or export data': 'Requests to delete an account or obtain a copy of personal data.',
  'Subscriptions and plans': 'Issues with plans, renewals, upgrades, downgrades, or cancellations.',
  'Credits and balance': 'Missing credits, duplicate deductions, early expiration, or an incorrect balance.',
  'Payouts and withdrawals': 'Missing, delayed, held, or rejected earnings payouts.',
  'Charges and receipts': 'Incorrect charges, invoices, or receipts.',
  'Editor problems': 'The editor crashes, freezes, lags, or its tools do not work properly.',
  'Export and rendering': 'Failed exports, unfinished rendering, or incorrect output.',
  'Uploads and storage': 'Failed or stuck uploads, or incorrect storage quotas.',
  'Project files': 'Missing projects, projects that will not open, or lost content.',
  'Sharing and collaboration': 'Problems with project invitations, permissions, syncing, or lost edits.',
  'Inbox, chat, and calls': 'Missing messages, broken conversations, or failed calls.',
  'Notifications and email': 'Missing, duplicated, or incorrectly delivered alerts and emails.',
  'Report a user': 'Harassment, impersonation, or scams outside the forum, marketplace, or jobs sections.',
  'Copyright claim': "Someone is using or selling the member's work without permission anywhere on Ensemble.",
  'Appeal an account penalty': 'Appeals for account warnings, suspensions, bans, or payout holds.',
  Other: 'Any issue that does not fit the available types.',
  'Posts and replies': 'Missing discussions, posts, or replies, or content displaying incorrectly.',
  'Forum groups': 'Problems with groups, memberships, or settings.',
  'Report a post or member': 'Reports involving forum posts, replies, groups, or members breaking the rules.',
  'Appeal a forum action': 'Appeals for removed content or restrictions on forum participation.',
  'Seller verification': 'The eligibility check required to sell is pending, rejected, or unclear. This is different from account identity verification.',
  'Listing review': "The member's listing is stuck in review or was rejected.",
  'Asset purchase and download': 'The buyer paid but did not receive the file, or the download failed.',
  'File is wrong or broken': 'The delivered file is damaged, incomplete, or different from what was advertised.',
  'Marketplace refunds': 'The buyer wants credits from an asset purchase returned.',
  'Report a listing or seller': 'Reports involving scams, misleading listings, or rule violations.',
  'Asset reviews': 'Reports about fake, abusive, or unfair reviews of an asset or seller.',
  'Appeal a marketplace action': 'Appeals for removed listings or restrictions on selling.',
  'Job and gig listings': 'Missing listings, stuck submissions, or incorrect listing details.',
  'Proposals and hiring': 'Missing proposals or applications, or hiring processes that fail.',
  'Contracts, milestones, and orders': 'Problems with agreements, escrow, milestone payments, or gig orders.',
  'Delivery and disputes': 'Work was not delivered, does not match the agreement, or the parties disagree about the result.',
  'Cancellations and refunds': 'Requests to cancel a contract or gig order, or return escrowed funds.',
  'Report a listing or user': 'Reports involving scams or rule violations by jobs, gigs, clients, or freelancers.',
  'Gig reviews': 'Reports about fake, abusive, or unfair reviews of gigs, clients, or freelancers.',
  'Appeal a jobs action': 'Appeals for removed listings or restrictions on Jobs & Gigs.',
};

export const DEFAULT_TICKET_PRIORITY: Record<string, 'Low' | 'Medium' | 'High'> = {
  'Account compromised': 'High',
  'Payouts and withdrawals': 'High',
  'Copyright claim': 'High',
  'Delivery and disputes': 'High',
  'Notifications and email': 'Low',
};

export function subgroupForType(type: string) {
  for (const group of SUPPORT_SUBGROUPS) {
    if ((group.types as readonly string[]).includes(type)) return group.label;
  }
  return null;
}

/** Escalate: pick a moderator queue, then a type allowed for that queue only */
export const ESCALATE_ROLE_OPTIONS = [
  'Support Moderator',
  'Marketplace Moderator',
  'Forum Moderator',
  'Jobs N Gigs Moderator',
  'Admin',
] as const;

export const ESCALATE_TYPES_BY_ROLE: Record<string, readonly string[]> = {
  'Support Moderator': SUPPORT_TICKET_TYPES,
  'Marketplace Moderator': MARKETPLACE_TICKET_TYPES,
  'Forum Moderator': FORUM_TICKET_TYPES,
  'Forums Moderator': FORUM_TICKET_TYPES,
  'Jobs N Gigs Moderator': JOBS_TICKET_TYPES,
  'Jobs & Gigs Moderator': JOBS_TICKET_TYPES,
  'Jobs Moderator': JOBS_TICKET_TYPES,
  Admin: TICKET_TYPE_OPTIONS,
  Administrator: TICKET_TYPE_OPTIONS,
};

export function escalateTypesForRole(role: string): string[] {
  return [...(ESCALATE_TYPES_BY_ROLE[role] || [])];
}

export type TicketsOverview = {
  lastUpdated: string;
  summary: {
    openTickets: number;
    totalTickets: number;
    unassignedTickets: number;
    highPriorityTickets: number;
    awaitingReplyTickets?: number;
    escalatedTickets?: number;
    openDisputes: number;
    totalDisputes: number;
    creditsAtRisk: number;
    openReports: number;
    totalReports: number;
    avgResolutionHours: number;
    slaCompliancePercent: number;
  };
  charts: {
    ticketStatusMix: ChartSegment[];
    ticketCategories: ChartSegment[];
    ticketTypes?: ChartSegment[];
    openByPriority: { label: string; value: number }[];
    disputeStatusMix: ChartSegment[];
  };
  /** Distinct ticket types from tickets.type enum values */
  types: string[];
  typeDetails?: {
    label: string;
    queueRole: string;
    description?: string | null;
    group?: string | null;
    subgroup?: string | null;
    fields?: { key: string; label: string; kind?: string; required?: boolean }[];
  }[];
  escalateByRole?: Record<string, string[]>;
  escalateRoles?: string[];
  statuses?: string[];
  priorities?: string[];
  /** @deprecated use types */
  categories?: string[];
  tickets: SupportTicket[];
  disputes: Dispute[];
  reports: UserReport[];
  staffWorkload: StaffWorkload[];
  recentActivity: TicketActivity[];
  currentStaffId?: string | number | null;
  alerts: {
    id: string;
    message: string;
    severity: string;
    action?: {
      tab?: 'overview' | 'tickets' | 'mine' | 'disputes' | 'reports' | 'assignments' | string;
      ticketFilters?: Partial<{
        search: string;
        status: string;
        priority: string;
        type: string;
        assignee: string;
        flag: string;
      }>;
    };
  }[];
  dataSources: { tables: string[]; persisted: boolean };
};

export type TicketDetail = {
  ticket: SupportTicket;
  messages: TicketMessage[];
  chatId?: string | null;
  chatAvailable?: boolean;
  types?: string[];
  statuses?: string[];
  priorities?: string[];
  typeDetails?: {
    label: string;
    queueRole: string;
    description?: string | null;
    group?: string | null;
    subgroup?: string | null;
    fields?: { key: string; label: string; kind?: string; required?: boolean }[];
  }[];
  escalateByRole?: Record<string, string[]>;
  escalateRoles?: string[];
  /** @deprecated use types */
  categories?: string[];
  permissions?: TicketPermissions;
  assignableStaff: { staffId: number | string; name: string; role: string }[];
  timeline?: TicketTimelineEntry[];
  articles?: TicketArticle[];
  payments?: TicketPaymentEvidence | null;
  canAdjustCredits?: boolean;
  formValues?: { key: string; label: string; value: string }[];
};

export function ticketTypeOf(t: { type?: string; category?: string }) {
  return t.type || t.category || 'Other';
}
