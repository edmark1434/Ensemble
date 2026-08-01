import type { ChartSegment, SupportTicket, UserReport } from '@/pages/admin/ticketManagement/ticketTypes';

export type ListingPerson = {
  accountId: number;
  name: string;
  handle: string;
};

export type MarketplaceListing = {
  id: number;
  number: string;
  title: string;
  description: string | null;
  category: string | null;
  priceCredits: number;
  thumbnailUrl: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'delisted';
  rejectionReason: string | null;
  submittedBy: ListingPerson;
  reviewedBy: { staffId: number; name: string } | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketplaceTicket = {
  id: number;
  number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  channel: string;
  requester: { accountId: number; name: string; username: string; email: string | null };
  assignee: { staffId: number; name: string; role: string } | null;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type MarketplaceAlert = {
  id: string;
  message: string;
  severity: string;
  action?: {
    tab?: string;
    ticketFilters?: Record<string, string>;
  };
};

export type MarketplaceOverview = {
  lastUpdated: string;
  summary: {
    totalListings: number;
    pendingListings: number;
    approvedListings: number;
    rejectedListings: number;
    delistedListings: number;
    approvedCreditValue: number;
    openTickets: number;
    totalTickets: number;
    unassignedTickets: number;
    highPriorityTickets: number;
    awaitingReplyTickets: number;
    escalatedTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    openReports: number;
    totalReports: number;
    unassignedReports: number;
    highPriorityReports: number;
    resolvedReports: number;
    restrictedAccounts: number;
  };
  charts: {
    listingStatusMix: ChartSegment[];
    listingCategories: ChartSegment[];
    ticketStatusMix: ChartSegment[];
    ticketCategories: ChartSegment[];
    reportStatusMix: ChartSegment[];
    reportTypes: ChartSegment[];
  };
  recentListings: MarketplaceListing[];
  recentTickets: SupportTicket[];
  flaggedReports: UserReport[];
  alerts: MarketplaceAlert[];
  dataSources?: { tables: string[]; persisted: boolean };
};

export type SellerListingSummary = {
  id: number;
  number: string;
  title: string;
  category: string | null;
  priceCredits: number;
  status: MarketplaceListing['status'];
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

export type SellerListingsHistory = {
  account: {
    accountId: number;
    name: string;
    handle: string;
    status: string;
  };
  counts: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    delisted: number;
  };
  listings: SellerListingSummary[];
};

export type Violation = {
  id: number;
  number: string;
  account: { accountId: number; name: string; handle: string; status: string };
  title: string;
  reason: string | null;
  points: number;
  status: string;
  issuedBy: string;
  createdAt: string;
};

export type RestrictedAccount = {
  accountId: number;
  name: string;
  handle: string;
  status: string;
};

export type RestrictionsData = {
  violations: Violation[];
  restrictedAccounts: RestrictedAccount[];
};
