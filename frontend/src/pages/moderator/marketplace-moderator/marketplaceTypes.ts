import type { ChartSegment, SupportTicket, UserReport } from '@/pages/admin/ticketManagement/ticketTypes';

export type ListingPerson = {
  accountId: number;
  name: string;
  handle: string;
};

export type ListingAssetThumbnail = {
  mediaAssetId: string;
  path: string;
  position: number;
};

export type ListingAssetMediaFile = {
  mediaAssetId: string;
  name: string;
  type: 'image' | 'video' | 'audio' | string;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  proxyPath: string | null;
  thumbnailPath: string | null;
  processingStatus: 'ready' | 'processing' | 'failed' | string;
  position: number;
};

export type ListingLinkedAsset = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  type: string | null;
  thumbnails: ListingAssetThumbnail[];
  mediaFiles: ListingAssetMediaFile[];
};

export type MarketplaceListing = {
  id: number;
  number: string;
  title: string;
  description: string | null;
  category: string | null;
  priceCredits: number;
  thumbnailUrl: string | null;
  marketAssetId?: string | null;
  asset?: ListingLinkedAsset | null;
  status: 'pending' | 'approved' | 'rejected' | 'delisted';
  rejectionReason: string | null;
  moderationNote?: string | null;
  /** Reason recorded for a delist or a send-back-for-re-approval. */
  moderationNote: string | null;
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

/** Review backlog, throughput, and copyright pressure for the listing queue. */
export type MarketplaceQueueHealth = {
  oldestPendingAt: string | null;
  pendingOver48h: number;
  pendingOver7d: number;
  reviewedLast24h: number;
  reviewedLast7d: number;
  approvedLast7d: number;
  removedLast7d: number;
  avgReviewHours: number | null;
  copyrightReports: number;
};

export type MarketplaceSummary = MarketplaceQueueHealth & {
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

export type MarketplaceOverview = {
  lastUpdated: string;
  queueHealth?: MarketplaceQueueHealth;
  summary: MarketplaceSummary;
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
    merit?: number;
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
  type: string;
  reason: string | null;
  points: number;
  status: string;
  issuedBy: string;
  createdAt: string;
  expiresAt?: string | null;
  active?: boolean;
};

export type RestrictedAccount = {
  accountId: string;
  name: string;
  handle: string;
  status: string;
};

export type AccountActivityItem = {
  id: string;
  accountId: string;
  accountName?: string | null;
  accountHandle?: string | null;
  action: string;
  eventCode: string;
  actorName?: string | null;
  actorRole?: string | null;
  createdAt: string;
};

export type RestrictionsData = {
  violations: Violation[];
  restrictedAccounts: RestrictedAccount[];
  recentActivity?: AccountActivityItem[];
};
