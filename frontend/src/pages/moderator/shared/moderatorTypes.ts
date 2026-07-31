import type {
  SupportTicket,
  Dispute,
  UserReport,
  ChartSegment,
  TicketDetail,
  TicketMessage,
  TicketActivity,
} from "@/pages/admin/ticketManagement/ticketTypes";

export type { SupportTicket, Dispute, UserReport, ChartSegment, TicketDetail, TicketMessage, TicketActivity };

export type DisputeDetail = {
  dispute: Dispute;
  messages: TicketMessage[];
  chatId?: string | null;
  chatAvailable?: boolean;
  permissions?: import("@/pages/admin/ticketManagement/ticketTypes").DisputePermissions;
  assignableStaff: { staffId: number | string; name: string; role: string }[];
};

export type Alert = {
  id: string;
  message: string;
  severity: string;
  action?: {
    tab?: string;
    ticketFilters?: Record<string, string>;
  };
};

export type StaffWorkloadLite = {
  staffId: number | string;
  name: string;
  role: string;
  openTickets: number;
  openReports: number;
  openDisputes?: number;
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
    openDisputes: number;
    totalDisputes: number;
    creditsAtRisk: number;
    awaitingReplyTickets: number;
    slaCompliancePercent: number;
    ticketsThisWeek: number;
    messagesThisWeek: number;
    totalMessages: number;
    activeViolations: number;
    activeRestrictions: number;
  };
  charts: {
    ticketStatusMix: ChartSegment[];
    ticketCategories: ChartSegment[];
    priorityMix: ChartSegment[];
    disputeStatusMix: ChartSegment[];
    activityTrend: { day: string; tickets: number; messages: number }[];
  };
  recentTickets: SupportTicket[];
  recentDisputes: Dispute[];
  recentReports: UserReport[];
  ticketLog: TicketActivity[];
  staffWorkload: StaffWorkloadLite[];
  alerts: Alert[];
  dataSources: { tables: string[]; persisted: boolean };
};

export type ForumContentStats =
  | { available: false }
  | {
      available: true;
      totalGroups: number;
      activeGroups: number;
      totalDiscussions: number;
      removedDiscussions: number;
      totalComments: number;
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
  forumContent: ForumContentStats;
  charts: {
    ticketStatusMix: ChartSegment[];
    ticketCategories: ChartSegment[];
  };
  recentTickets: SupportTicket[];
  flaggedReports: UserReport[];
  alerts: Alert[];
  notice: string | null;
  dataSources: { tables: string[]; persisted: boolean };
};

export type ForumGroupModeration = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  status: string;
  memberCount: number;
  members: { userId: string | number; role: string; isBanned: boolean }[];
  discussionCount: number;
  tags: { tag_id?: string | number; tag_name?: string }[];
  createdAt: string | null;
  deletedAt: string | null;
};

export type ForumDiscussionModeration = {
  id: string;
  title: string;
  description: string | null;
  groupId: string | null;
  groupName: string | null;
  author: { userId: string | number | null; handle: string | null; name: string | null };
  commentCount: number;
  likeCount: number;
  status: string;
  isLocked: boolean;
  isSticky: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ForumDiscussionDetail = {
  id: string;
  title: string;
  description: string | null;
  groupId: string | null;
  author: { userId: string | number | null; handle: string | null; name: string | null };
  status: string;
  isLocked: boolean;
  isSticky: boolean;
  createdAt: string | null;
  comments: {
    commentId: string | number;
    comment: string;
    author: { userId: string | number | null; handle: string | null; name: string | null };
    likeCount: number;
    isDeleted: boolean;
    createdAt: string | null;
  }[];
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
    totalJobs: number;
    activeJobs: number;
    totalGigs: number;
    activeGigs: number;
    activeContracts: number;
    jobsThisWeek: number;
    gigsThisWeek: number;
    totalProposals: number;
    pendingProposals: number;
    totalGigRequests: number;
    pendingGigRequests: number;
    totalContracts: number;
    completedContracts: number;
    creditsInEscrow: number;
    avgContractRating: number;
    totalRatings: number;
  };
  charts: {
    ticketStatusMix: ChartSegment[];
    disputeStatusMix: ChartSegment[];
    postingsMix: ChartSegment[];
    contractStatusMix: ChartSegment[];
    postingTrend: { day: string; jobs: number; gigs: number }[];
  };
  recentTickets: SupportTicket[];
  disputes: Dispute[];
  alerts: Alert[];
  dataSources: { tables: string[]; persisted: boolean };
};

export type JobsGigsPosting = {
  id: string;
  postNumber: string;
  type: "job" | "gig";
  title: string;
  description: string | null;
  status: string;
  paymentType: string;
  experienceLevel: string | null;
  rateCreditsMin: number | null;
  rateCreditsMax: number | null;
  applicantCount: number;
  contractCount: number;
  tags: string[];
  author: { accountId: string; name: string; handle: string };
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
  archivedAt: string | null;
};

export type PostingAttachment = { fileId: string; name: string; mimeType: string; sizeBytes: number };

export type PostingContract = {
  id: string;
  type: string;
  paymentType: string;
  rateCredits: number;
  status: string;
  counterparty: { name: string; handle: string };
  startsAt: string | null;
  createdAt: string;
};

export type JobPostingDetail = {
  type: "job";
  id: string;
  postNumber: string;
  title: string;
  description: string;
  status: string;
  paymentType: string;
  experienceLevel: string;
  noOfHires: number;
  roughDeadline: string;
  roughDurationHrs: number | null;
  roughNoOfRevisions: number;
  rateCreditsMin: number;
  rateCreditsMax: number;
  weeklyHrsMax: number | null;
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
  archivedAt: string | null;
  author: { accountId: string; name: string; handle: string; status: string; meritScore: number | null };
  tags: string[];
  attachments: PostingAttachment[];
  proposals: {
    id: string;
    status: string;
    rateCredits: number;
    weeklyHrsMax: number | null;
    milestoneCount: number;
    freelancer: { name: string; handle: string };
    createdAt: string;
  }[];
  contracts: PostingContract[];
};

export type GigPostingDetail = {
  type: "gig";
  id: string;
  postNumber: string;
  title: string;
  description: string;
  status: string;
  paymentType: string;
  noOfConcurrentMax: number;
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
  archivedAt: string | null;
  author: { accountId: string; name: string; handle: string; status: string; meritScore: number | null };
  tags: string[];
  attachments: PostingAttachment[];
  tiers: {
    id: string;
    title: string;
    description: string;
    rateCredits: number;
    weeklyHrsMax: number | null;
    deliveryDays: number;
    noOfRevisionsMax: number;
  }[];
  addons: { id: string; name: string; priceCredits: number; additionalDays: number }[];
  requests: {
    id: string;
    status: string;
    tierTitle: string;
    rateCredits: number;
    client: { name: string; handle: string };
    createdAt: string;
  }[];
  contracts: PostingContract[];
};

export type JobsGigsPostingDetail = JobPostingDetail | GigPostingDetail;

export type UserJobsHistory = {
  account: { accountId: string; name: string; handle: string; status: string };
  jobs: {
    id: string;
    title: string;
    status: string;
    paymentType: string;
    rateCreditsMin: number;
    rateCreditsMax: number;
    createdAt: string;
  }[];
  gigs: { id: string; title: string; status: string; paymentType: string; createdAt: string }[];
  contracts: {
    id: string;
    type: string;
    paymentType: string;
    rateCredits: number;
    status: string;
    role: string;
    relatedTitle: string | null;
    createdAt: string;
  }[];
  proposals: { id: string; jobTitle: string | null; status: string; rateCredits: number; createdAt: string }[];
  gigRequests: {
    id: string;
    gigTitle: string;
    tierTitle: string;
    rateCredits: number;
    status: string;
    createdAt: string;
  }[];
};
