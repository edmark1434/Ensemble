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
  channel: string;
  requester: TicketPerson;
  assignee: TicketAssignee | null;
  escalatedBy?: TicketAssignee | null;
  isEscalated?: boolean;
  waitingForResponse?: boolean;
  lastMessageAuthorType?: string | null;
  relatedReportId: number | string | null;
  relatedDisputeId: number | string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  resolvedAt?: string | null;
};

export type TicketMessage = {
  id: number | string;
  authorType: string;
  authorName: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
};

export type Dispute = {
  id: number | string;
  number: string;
  title: string;
  reason: string | null;
  status: string;
  priority: string;
  initiator: TicketPerson;
  respondent: TicketPerson;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  assignee: TicketAssignee | null;
  creditAmount: number;
  openedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
};

export type UserReport = {
  id: number | string;
  number: string;
  reporter: TicketPerson;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  reason: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: { staffId: number | string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
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

export const TICKET_STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
export const TICKET_PRIORITY_OPTIONS = ['Low', 'Medium', 'High'] as const;
export const TICKET_TYPE_OPTIONS = [
  'Account Access',
  'Account Verification',
  'Subscriptions and Plans',
  'Credit Top-ups',
  'Withdrawing Earnings',
  'Video Editor',
  'Forums',
  'Asset Marketplace',
  'Jobs and Gigs',
  'Other',
] as const;

/** Escalate: pick a moderator queue, then a type allowed for that queue only */
export const ESCALATE_ROLE_OPTIONS = [
  'Support Moderator',
  'Marketplace Moderator',
  'Forum Moderator',
  'Jobs N Gigs Moderator',
  'Admin',
] as const;

export const ESCALATE_TYPES_BY_ROLE: Record<string, readonly string[]> = {
  'Support Moderator': [
    'Account Access',
    'Account Verification',
    'Subscriptions and Plans',
    'Credit Top-ups',
    'Withdrawing Earnings',
    'Video Editor',
    'Other',
  ],
  'Marketplace Moderator': ['Asset Marketplace'],
  'Forum Moderator': ['Forums'],
  'Forums Moderator': ['Forums'],
  'Jobs N Gigs Moderator': ['Jobs and Gigs'],
  'Jobs & Gigs Moderator': ['Jobs and Gigs'],
  'Jobs Moderator': ['Jobs and Gigs'],
  Admin: [...TICKET_TYPE_OPTIONS],
  Administrator: [...TICKET_TYPE_OPTIONS],
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
    openByPriority: { label: string; value: number }[];
    disputeStatusMix: ChartSegment[];
  };
  /** Distinct ticket types from tickets table */
  types: string[];
  /** @deprecated use types */
  categories?: string[];
  tickets: SupportTicket[];
  disputes: Dispute[];
  reports: UserReport[];
  staffWorkload: StaffWorkload[];
  recentActivity: TicketActivity[];
  alerts: { id: string; message: string; severity: string }[];
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
  typeDetails?: { label: string; queueRole: string; description?: string | null }[];
  escalateByRole?: Record<string, string[]>;
  escalateRoles?: string[];
  /** @deprecated use types */
  categories?: string[];
  assignableStaff: { staffId: number | string; name: string; role: string }[];
};

export function ticketTypeOf(t: { type?: string; category?: string }) {
  return t.type || t.category || 'Other';
}
