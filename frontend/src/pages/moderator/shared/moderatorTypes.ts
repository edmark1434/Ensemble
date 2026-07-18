import type {
  SupportTicket,
  Dispute,
  UserReport,
  ChartSegment,
  TicketDetail,
} from "@/pages/admin/ticketManagement/ticketTypes";

export type { SupportTicket, Dispute, UserReport, ChartSegment, TicketDetail };

export type Alert = { id: string; message: string; severity: string };

export type StaffWorkloadLite = {
  staffId: number;
  name: string;
  role: string;
  openTickets: number;
  openReports: number;
  totalOpen: number;
};

export type SupportOverview = {
  lastUpdated: string;
  summary: {
    openTickets: number;
    totalTickets: number;
    unassignedTickets: number;
    highPriorityTickets: number;
    resolvedTickets: number;
    openReports: number;
    totalReports: number;
    chatWaiting: number;
    slaCompliancePercent: number;
  };
  charts: {
    ticketStatusMix: ChartSegment[];
    ticketCategories: ChartSegment[];
  };
  recentTickets: SupportTicket[];
  staffWorkload: StaffWorkloadLite[];
  alerts: Alert[];
  dataSources: { tables: string[]; persisted: boolean };
};

export type ForumOverview = {
  lastUpdated: string;
  summary: {
    openTickets: number;
    totalTickets: number;
    unassignedTickets: number;
    flaggedContent: number;
    totalReports: number;
    resolvedTickets: number;
  };
  charts: {
    ticketStatusMix: ChartSegment[];
    ticketCategories: ChartSegment[];
  };
  recentTickets: SupportTicket[];
  flaggedReports: UserReport[];
  alerts: Alert[];
  notice: string;
  dataSources: { tables: string[]; persisted: boolean };
};

export type JobsOverview = {
  lastUpdated: string;
  summary: {
    openTickets: number;
    totalTickets: number;
    unassignedTickets: number;
    openDisputes: number;
    totalDisputes: number;
    creditsAtRisk: number;
    resolvedTickets: number;
  };
  charts: {
    ticketStatusMix: ChartSegment[];
    disputeStatusMix: ChartSegment[];
  };
  recentTickets: SupportTicket[];
  disputes: Dispute[];
  alerts: Alert[];
  dataSources: { tables: string[]; persisted: boolean };
};
