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
  'Sign-in and password': 'The member cannot sign in, the password reset fails, or the session keeps ending.',
  'Account compromised': 'Someone else may be using the account, or the member sees sign-ins they do not recognize.',
  'Identity verification': 'The identity check is pending, rejected, or unclear. This is not seller verification.',
  'Profile and settings': 'The profile, photo, banner, email, or account settings will not save or look wrong.',
  Teams: 'A team invite, role, removal, or a suspended team membership is stuck or wrong.',
  'Delete account or export data': 'The member wants their data exported or the account deleted.',
  'Subscriptions and plans': 'The plan, renewal, upgrade, or cancellation is wrong.',
  'Credits and balance': 'Bought credits did not arrive, or the balance does not match what they paid.',
  'Payouts and withdrawals': 'A cash-out or earnings payout is missing, delayed, or rejected.',
  'Charges and receipts': 'A card charge, invoice, or receipt looks wrong.',
  'Editor problems': 'The editor crashes, will not open, or a tool inside it fails.',
  'Export and rendering': 'An export fails, stalls, or the rendered file is wrong.',
  'Uploads and storage': 'An upload fails, or stored media is missing or over the limit.',
  'Project files': 'A project is missing, corrupted, or will not open.',
  'Sharing and collaboration': 'A project invite, member, or shared edit is stuck or wrong.',
  'Inbox, chat, and calls': 'A message, conversation, or call is missing, stuck, or failed.',
  'Notifications and email': 'Alerts or email are missing, duplicated, or sent to the wrong place.',
  'Report a user': 'The member is reporting another account.',
  'Copyright claim': 'A member says their work was copied, or they received a copyright notice.',
  'Appeal an account penalty': 'The member wants a warning, suspension, lock, or ban reviewed.',
  Other: 'None of the support types fit.',
  'Posts and replies': 'A discussion, post, or reply is missing, stuck, or showing the wrong content.',
  'Forum groups': 'A group, its membership, or its settings is wrong.',
  'Report a post or member': 'The member is reporting a forum post, reply, or member.',
  'Appeal a forum action': 'The member wants a removed post, locked discussion, or group ban reviewed.',
  'Seller verification': 'The check that allows someone to sell is stuck or unclear.',
  'Listing review': 'A listing is stuck in review, was rejected, or should be taken down.',
  'Asset purchase and download': 'The buyer paid for an asset and did not get the file, or the download failed.',
  'File is wrong or broken': 'The file arrived, but it is incomplete, damaged, or not what the listing promised.',
  'Marketplace refunds': 'The buyer wants the credits from an asset purchase returned.',
  'Report a listing or seller': 'The member is reporting a listing or a seller.',
  'Asset reviews': 'A review on an asset is missing, wrong, or abusive.',
  'Appeal a marketplace action': 'The member wants a rejected listing, delist, or seller restriction reviewed.',
  'Job and gig listings': 'A job or gig listing is missing, stuck, or showing the wrong details.',
  'Proposals and hiring': 'A proposal or application was not received, or hiring the person did not go through.',
  'Contracts, milestones, and orders': 'The agreement, escrow, a milestone payment, or a gig order is stuck or wrong.',
  'Delivery and disputes': 'Work was delivered and the parties disagree, or the delivery never arrived.',
  'Cancellations and refunds': 'A job or gig was cancelled and the refund or escrow release is stuck.',
  'Report a listing or user': 'The member is reporting a job, gig, or the other party.',
  'Gig reviews': 'A review on a gig order is missing, wrong, or abusive.',
  'Appeal a jobs action': 'The member wants a removed listing, cancelled order, or hiring block reviewed.',
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
  typeDetails?: { label: string; queueRole: string; description?: string | null; group?: string | null; subgroup?: string | null }[];
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
  typeDetails?: { label: string; queueRole: string; description?: string | null; group?: string | null; subgroup?: string | null }[];
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
};

export function ticketTypeOf(t: { type?: string; category?: string }) {
  return t.type || t.category || 'Other';
}
