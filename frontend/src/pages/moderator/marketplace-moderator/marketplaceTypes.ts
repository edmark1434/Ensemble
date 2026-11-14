import type { ChartSegment, SupportTicket, UserReport } from '@/pages/admin/ticketManagement/ticketTypes';

export type ListingPerson = {
  accountId: number;
  name: string;
  handle: string;
};

export type ListingAssetThumbnail = {
  mediaAssetId: string;
  /** Public derivative path; private originals are never sent here. */
  path: string;
  position: number;
  /** True when this showcase image is also one of the content files. */
  isContent?: boolean;
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
  /** File name as the seller uploaded it. */
  originalName?: string | null;
  uploadedAt?: string | null;
  /** Watermarked public preview; null until processing finishes for video/audio. */
  proxyPath: string | null;
  thumbnailPath: string | null;
  processingStatus: 'ready' | 'processing' | 'failed' | string;
  processingError?: string | null;
  processingAttempts?: number;
  position: number;
};

export type ListingTemplateInfo = {
  snapshotBytes: number;
  createdAt: string | null;
  sourceProjectId: string | null;
};

export type ListingAssetStats = {
  activeLicenses: number;
  refundedLicenses: number;
  likes: number;
  reviews: number;
  averageRating: number | null;
};

/** Another market asset that shares an upload (same size and type) or the same title. */
export type ListingDuplicateSignal = {
  marketAssetId: string;
  matchedOn: 'file' | 'title';
  matchedMedia: string | null;
  name: string;
  assetStatus: string;
  createdAt: string;
  listingId: string | null;
  listingNumber: string | null;
  listingStatus: string | null;
  seller: ListingPerson | null;
  sameSeller: boolean;
};

export type ListingReportSummary = {
  open: number;
  total: number;
  items: {
    id: string;
    number: string;
    type: string;
    status: string;
    priority: string | null;
    isOpen: boolean;
    createdAt: string;
  }[];
};

export type ListingSellerContext = {
  accountId: string;
  status: string;
  joinedAt: string | null;
  merit: number;
  listings: { total: number; approved: number; rejected: number; delisted: number; pending: number };
};

export type ListingReviewEvent = {
  id: string;
  action: string;
  eventCode: string;
  actorName: string | null;
  actorRole: string | null;
  status: string | null;
  reason: string | null;
  fileName: string | null;
  createdAt: string;
};

/** Signed, expiring link to one original upload (staff review only). */
export type ListingOriginalAccess = {
  url: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  expiresIn: number;
};

export type ListingLinkedAsset = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  type: string | null;
  priceCredits?: number;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  thumbnails: ListingAssetThumbnail[];
  mediaFiles: ListingAssetMediaFile[];
  template?: ListingTemplateInfo | null;
  stats?: ListingAssetStats;
};

export type MarketplaceListing = {
  /** UUID (`marketplace_listings.listing_id`). Never convert it with Number(). */
  id: string;
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
  /** Reason recorded for a delist or a send-back-for-re-approval. */
  moderationNote: string | null;
  submittedBy: ListingPerson;
  reviewedBy: { staffId: number; name: string } | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Detail-only context (GET /listings/:id). */
  seller?: ListingSellerContext | null;
  reports?: ListingReportSummary;
  reviewHistory?: ListingReviewEvent[];
  duplicates?: ListingDuplicateSignal[];
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
  /** error | warning | info | success */
  severity: string;
  title?: string;
  detail?: string;
  count?: number;
  action?: {
    tab?: string;
    /** Query params for the target desk (ticket filters, report presets). */
    query?: Record<string, string> | null;
    ticketFilters?: Record<string, string>;
  } | null;
};

export type MarketplaceTicketSla = {
  oldestOpenAt: string | null;
  oldestUnassignedAt: string | null;
  awaitingFirstReply: number;
  overdue: number;
  openedLast7d: number;
  closedLast7d: number;
  avgFirstReplyHours: number | null;
  avgResolutionHours: number | null;
  avgSatisfaction: number | null;
  ratedTickets: number;
};

export type MarketplaceReportSla = {
  filedLast7d: number;
  decidedLast7d: number;
  oldestOpenAt: string | null;
  avgResolutionHours: number | null;
};

export type MarketplaceActivityDay = {
  day: string;
  submitted: number;
  decided: number;
  ticketsOpened: number;
  ticketsClosed: number;
  reportsFiled: number;
};

export type MarketplaceTeamMember = {
  staffId: string;
  name: string;
  handle: string | null;
  role: string;
  openTickets: number;
  openReports: number;
  reviewsLast7d: number;
  ticketsClosedLast7d: number;
};

export type MarketplaceSellerToWatch = {
  accountId: string;
  name: string;
  handle: string | null;
  status: string;
  openReports: number;
  totalReports: number;
  sanctioned: number;
  liveListings: number;
  removedListings: number;
  lastReportedAt: string | null;
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
  sanctionedReports?: number;
  deniedReports?: number;
  restrictedAccounts: number;
};

export type MarketplaceOverview = {
  lastUpdated: string;
  queueHealth?: MarketplaceQueueHealth;
  summary: MarketplaceSummary;
  ticketSla?: MarketplaceTicketSla;
  reportSla?: MarketplaceReportSla;
  activity?: MarketplaceActivityDay[];
  team?: MarketplaceTeamMember[];
  sellersToWatch?: MarketplaceSellerToWatch[];
  charts: {
    listingStatusMix: ChartSegment[];
    listingCategories: ChartSegment[];
    ticketStatusMix: ChartSegment[];
    ticketCategories: ChartSegment[];
    reportStatusMix: ChartSegment[];
    reportTypes: ChartSegment[];
    reportReasons?: { label: string; value: number }[];
  };
  recentListings: MarketplaceListing[];
  recentTickets: SupportTicket[];
  flaggedReports: UserReport[];
  alerts: MarketplaceAlert[];
  dataSources?: { tables: string[]; persisted: boolean };
};

export type SellerListingSummary = {
  id: string;
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
