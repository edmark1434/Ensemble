export type TicketPerson = {
  accountId?: number | string;
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
  category: string;
  priority: string;
  status: string;
  channel: string;
  requester: TicketPerson;
  assignee: TicketAssignee | null;
  relatedReportId: number | string | null;
  relatedDisputeId: number | string | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
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
  assignableStaff: { staffId: number; name: string; role: string }[];
};
