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

export type DisputeCaseMilestone = {
  id: string;
  index: number;
  name: string;
  description: string | null;
  status: string;
  credits: number;
  revisions: number;
  deadlineAt: string | null;
  startedAt: string | null;
};

export type DisputeCaseContract = {
  id: string;
  linked: boolean;
  title: string;
  contractType: string;
  paymentType: string;
  status: string;
  rateCredits: number;
  revisionPriceCredits: number;
  startsAt: string | null;
  deadlineAt: string | null;
  clientName: string;
  clientHandle: string;
  freelancerName: string;
  freelancerHandle: string;
  milestones: DisputeCaseMilestone[];
};

export type DisputeCaseTransaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  referenceTable: string | null;
  referenceLabel: string | null;
  sourceName: string;
  sourceHandle: string | null;
  sourceWallet: string;
  destinationName: string;
  destinationHandle: string | null;
  destinationWallet: string;
  tiedToThisDispute: boolean;
  reversesTransactionId?: string | null;
  reversedByTransactionId?: string | null;
  reversible?: boolean;
};

export type DisputeCaseRelated = {
  id: string;
  number: string | null;
  title: string;
  type: string;
  status: string;
  priority: string;
  description: string | null;
  visibility: boolean;
  creditAmount: number;
  openedAt: string | null;
  sanctionType: string | null;
  resolutionNotes: string | null;
  initiatorName: string;
  initiatorHandle: string;
  respondentName: string;
  respondentHandle: string;
};

export type DisputeCaseFile = {
  contracts: DisputeCaseContract[];
  transactions: DisputeCaseTransaction[];
  relatedDisputes: DisputeCaseRelated[];
};

export type DisputeDetail = {
  dispute: Dispute;
  caseFile?: DisputeCaseFile;
  messages: TicketMessage[];
  chatId?: string | null;
  chatAvailable?: boolean;
  permissions?: import("@/pages/admin/ticketManagement/ticketTypes").DisputePermissions;
  assignableStaff: { staffId: number | string; name: string; role: string }[];
  resolutionOptions?: import("@/pages/admin/ticketManagement/ticketTypes").DisputeResolutionOption[];
  reopenOptions?: import("@/pages/admin/ticketManagement/ticketTypes").DisputeResolutionOption[];
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

/** Response health for the Support desk header (`queueHealth` on the overview payload). */
export type SupportQueueHealth = {
  oldestOpenAt: string | null;
  oldestUnassignedAt: string | null;
  awaitingFirstReply: number;
  firstReplyBreached: number;
  openOver72h: number;
  openOver7d: number;
  closedLast24h: number;
  closedLast7d: number;
  avgFirstReplyHours: number | null;
  avgResolutionHours: number | null;
  avgSatisfaction: number | null;
  ratedTickets: number;
};

export type SupportDisputeHealth = {
  oldestOpenAt: string | null;
  unassigned: number;
  highPriority: number;
  resolvedLast7d: number;
};

/** Counts for the signed-in moderator only; null when the staff profile could not be resolved. */
export type SupportMyQueue = {
  openTickets: number;
  awaitingReply: number;
  highPriority: number;
  closedLast7d: number;
  openDisputes: number;
  openReports: number;
};

export type SupportGroupLoad = {
  label: string;
  open: number;
  total: number;
  types: string[];
};

export type SupportOverview = {
  lastUpdated: string;
  scope?: {
    queue: string;
    label: string;
    ticketTypes: string[];
    reportTargets: string[];
  };
  summary: {
    openTickets: number;
    totalTickets: number;
    unassignedTickets: number;
    highPriorityTickets: number;
    inProgressTickets?: number;
    escalatedTickets?: number;
    resolvedTickets: number;
    openReports: number;
    totalReports: number;
    openScopedReports?: number;
    totalScopedReports?: number;
    unassignedReports?: number;
    highPriorityReports?: number;
    resolvedReports?: number;
    reportsThisWeek?: number;
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
  queueHealth?: SupportQueueHealth;
  disputeHealth?: SupportDisputeHealth;
  myQueue?: SupportMyQueue | null;
  groupLoad?: SupportGroupLoad[];
  charts: {
    ticketStatusMix: ChartSegment[];
    ticketCategories: ChartSegment[];
    ticketTypes?: ChartSegment[];
    priorityMix: ChartSegment[];
    openByPriority?: ChartSegment[];
    supportGroups?: ChartSegment[];
    reportStatusMix?: ChartSegment[];
    reportTargets?: ChartSegment[];
    disputeStatusMix: ChartSegment[];
    activityTrend: { day: string; tickets: number; closed?: number; messages: number }[];
  };
  tickets?: SupportTicket[];
  recentTickets: SupportTicket[];
  recentDisputes: Dispute[];
  recentReports: UserReport[];
  ticketLog: TicketActivity[];
  recentActivity?: TicketActivity[];
  staffWorkload: StaffWorkloadLite[];
  currentStaffId?: string | number | null;
  alerts: Alert[];
  dataSources: { tables: string[]; persisted: boolean };
};

export type ForumContentStats =
  | { available: false }
  | {
      available: true;
      totalGroups: number;
      activeGroups: number;
      inactiveGroups?: number;
      totalDiscussions: number;
      removedDiscussions: number;
      lockedDiscussions?: number;
      stickyDiscussions?: number;
      totalComments: number;
      recentGroups?: {
        id: string;
        name: string;
        status: string;
        memberCount: number;
        createdAt: string | null;
      }[];
      recentDiscussions?: {
        id: string;
        title: string;
        groupId: string | null;
        groupName: string | null;
        commentCount: number;
        status: string;
        isLocked: boolean;
        isSticky: boolean;
        updatedAt: string | null;
      }[];
    };

export type ForumOverview = {
  lastUpdated: string;
  summary: {
    openTickets: number;
    totalTickets: number;
    unassignedTickets: number;
    highPriorityTickets?: number;
    awaitingReplyTickets?: number;
    escalatedTickets?: number;
    inProgressTickets?: number;
    flaggedContent: number;
    totalReports: number;
    unassignedReports?: number;
    highPriorityReports?: number;
    resolvedTickets: number;
    resolvedReports?: number;
  };
  forumContent: ForumContentStats;
  charts: {
    ticketStatusMix: ChartSegment[];
    ticketCategories: ChartSegment[];
    reportStatusMix?: ChartSegment[];
    reportTypes?: ChartSegment[];
  };
  recentTickets: SupportTicket[];
  flaggedReports: UserReport[];
  staffWorkload?: StaffWorkloadLite[];
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

/** "Is the desk keeping up?" numbers for the Jobs & Gigs dashboard (`queueHealth`). */
export type JobsQueueHealth = {
  oldestOpenTicketAt: string | null;
  ticketsOver48h: number;
  ticketsOver7d: number;
  ticketsNeverAnswered: number;
  ticketsResolvedLast7d: number;
  avgTicketResolutionHours: number | null;
  avgFirstReplyHours: number | null;
  oldestOpenReportAt: string | null;
  reportsOver48h: number;
  reportsClosedLast7d: number;
  oldestOpenDisputeAt: string | null;
  disputesOver7d: number;
  unassignedDisputes: number;
  disputesResolvedLast7d: number;
  postingsLast24h: number;
  staleActivePostings: number;
  stalePendingProposals: number;
  stalePendingRequests: number;
  postingActionsLast7d: number;
  postingActionsLast24h: number;
  lastPostingActionAt: string | null;
};

/** A job or gig with unresolved reports against it (`flaggedPostings`). */
export type JobsFlaggedPosting = {
  reportId: string;
  reportNumber: string;
  reportType: string;
  status: string;
  priority: string;
  createdAt: string;
  postingType: "job" | "gig" | null;
  postingId: string;
  postingTitle: string;
  openReports: number;
};

export type JobsOverview = {
  lastUpdated: string;
  queueHealth?: JobsQueueHealth;
  flaggedPostings?: JobsFlaggedPosting[];
  summary: {
    openTickets: number;
    totalTickets: number;
    unassignedTickets: number;
    highPriorityTickets?: number;
    awaitingReplyTickets?: number;
    escalatedTickets?: number;
    inProgressTickets?: number;
    openDisputes: number;
    totalDisputes: number;
    creditsAtRisk: number;
    resolvedTickets: number;
    openReports?: number;
    totalReports?: number;
    unassignedReports?: number;
    highPriorityReports?: number;
    resolvedReports?: number;
    totalJobs: number;
    activeJobs: number;
    pausedJobs?: number;
    closedJobs?: number;
    archivedJobs?: number;
    totalGigs: number;
    activeGigs: number;
    pausedGigs?: number;
    closedGigs?: number;
    archivedGigs?: number;
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
    ticketCategories?: ChartSegment[];
    disputeStatusMix: ChartSegment[];
    reportStatusMix?: ChartSegment[];
    reportTypes?: ChartSegment[];
    postingsMix: ChartSegment[];
    postingStatusMix?: ChartSegment[];
    contractStatusMix: ChartSegment[];
    jobCategories?: ChartSegment[];
    experienceLevels?: ChartSegment[];
    postingCategories?: ChartSegment[];
    postingTrend: { day: string; jobs: number; gigs: number }[];
  };
  recentTickets: SupportTicket[];
  recentPostings?: JobsGigsPosting[];
  flaggedReports?: UserReport[];
  disputes: Dispute[];
  staffWorkload?: StaffWorkloadLite[];
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
  category?: string | null;
  experienceLevel: string | null;
  rateCreditsMin: number | null;
  rateCreditsMax: number | null;
  applicantCount: number;
  contractCount: number;
  /** Unresolved reports filed against this posting. */
  openReportCount?: number;
  tags: string[];
  author: { accountId: string; name: string; handle: string };
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
  archivedAt: string | null;
};

export type PostingAttachment = { fileId: string; name: string; mimeType: string; sizeBytes: number };

/** A report filed against one posting, shown in the posting review modal. */
export type PostingReport = {
  id: string;
  number: string;
  type: string;
  status: string;
  priority: string;
  description: string | null;
  reporter: { name: string; handle: string };
  createdAt: string;
  updatedAt: string | null;
};

/** One past moderation action on a posting, from `account_activity`. */
export type PostingModerationEntry = {
  id: string;
  action: string;
  eventCode: string;
  previousStatus: string | null;
  status: string | null;
  reason: string | null;
  actor: { name: string; role: string } | null;
  createdAt: string;
};

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
  author: { accountId: string; name: string; handle: string; status: string; warningPoints: number | null };
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
  category?: string | null;
  reports?: PostingReport[];
  moderationHistory?: PostingModerationEntry[];
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
  author: { accountId: string; name: string; handle: string; status: string; warningPoints: number | null };
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
  category?: string | null;
  reports?: PostingReport[];
  moderationHistory?: PostingModerationEntry[];
};

export type JobsGigsPostingDetail = JobPostingDetail | GigPostingDetail;

export type UserJobsHistory = {
  account: { accountId: string; name: string; handle: string; status: string; merit?: number };
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
