export type PlatformKpis = {
  totalMembers: number;
  activeMembers: number;
  newMembersThisWeek: number;
  memberGrowthPercent: number;
  verifiedMembersPercent: number;
  profileCompletePercent: number;
  engagementScore: number;
  estimatedDau: number;
  estimatedWau: number;
  estimatedMau: number;
  forumGroups: number | null;
  forumDiscussions: number | null;
  totalCreditsInCirculation: number;
  avgMemberMerit: number;
  moderationTeamSize: number;
  pendingVerifications: number;
  openTickets?: number;
  ticketRatings?: number;
  ticketSatisfaction?: number | null;
  openReports?: number;
  openDisputes?: number;
  teams?: number;
  marketplaceListings?: number;
};

export type PlatformAlert = {
  id: string;
  message: string;
  severity: 'warning' | 'error' | 'info' | 'success';
};

export type SignupWeek = {
  week: string;
  weekStart: string;
  newMembers: number;
  cumulativeMembers: number;
};

export type MemberDirectoryEntry = {
  id: string | number;
  name: string;
  username: string;
  status: string;
  verification: string;
  merit: number;
  credits: number;
  joinedAt: string | null;
  hasAvatar: boolean;
  hasTagline: boolean;
};

export type ChartSegment = { label: string; value: number; color: string };

export type PlatformRevenue = {
  platformWalletBalance: number;
  platformWalletStatus: string;
  totalRevenueCredits: number;
  totalRevenuePhp: number;
  milestoneFeesCredits: number;
  jobPostingFeesCredits: number;
  proposalFeesCredits: number;
  otherFeesCredits: number;
  cashoutFeesPhp: number;
  subscriptionRevenuePhp: number;
  topupRevenuePhp: number;
  escrowHeldCredits: number;
  pendingPaymentsPhp: number;
};

export type PlatformPayout = {
  totalPayoutCredits: number;
  totalPayoutPhp: number;
  pendingPayoutCredits: number;
  pendingPayoutPhp: number;
  failedPayoutCredits: number;
  failedPayoutPhp: number;
  payoutCounts: {
    total: number;
    succeeded: number;
    pending: number;
    failed: number;
  };
  averagePayoutPhp: number;
  recentCashouts: {
    id: string;
    referenceId: string;
    channelCode: string;
    accountNo: string;
    accountName: string;
    amountCredits: number;
    feePhp: string | number;
    netAmountPhp: string | number;
    status: string;
    createdAt: string;
    userName: string;
    userHandle: string;
  }[];
};

export type PlatformTransaction = {
  id: string;
  type: string;
  amountCredits: number;
  status: string;
  createdAt: string;
  referenceTable: string | null;
  referenceId: string | null;
  direction: 'inflow' | 'outflow';
  revenueCredits?: number;
  fiatAmountPhp?: number | null;
  fiatChannelCode?: string | null;
  counterpartyName: string;
  counterpartyHandle: string | null;
  counterpartyType: string;
};

export type UserTransaction = {
  id: string;
  type: string;
  amountCredits: number;
  status: string;
  createdAt: string;
  referenceTable: string | null;
  referenceId: string | null;
  feeTransactionId?: string | null;
  sourceWalletType?: string;
  destWalletType?: string;
  sourceName: string;
  sourceHandle: string | null;
  sourceType: string;
  destinationName: string;
  destinationHandle: string | null;
  destinationType: string;
};

export type SubscriptionPlanItem = {
  planId: string;
  name: string;
  amountPhp: number;
  billingPeriod: string;
};

export type SubscriptionSummary = {
  activePaidSubscribers: number;
  totalActiveSubscriptions: number;
  recurringMembers: number;
  cancelingMembers: number;
  freeMembers: number;
  subscriptionPlatformEarnPhp: number;
  availablePlans: SubscriptionPlanItem[];
};

export type SubscriptionTransactionItem = {
  id: string;
  subscriptionId: string;
  planName: string;
  amountPhp: number;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
  subscriberName: string;
  subscriberHandle: string | null;
  subscriberEmail: string | null;
};

export type UserSubscriptionItem = {
  userId: string;
  name: string;
  username: string;
  email: string;
  joinedAt: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string;
  planName: string;
  planId: string | null;
  planAmountPhp: number;
  billingPeriod: string;
  isSubscribed: boolean;
  recurring: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  totalSpentPhp: number;
};

export type SubscriptionAnalytics = {
  summary: SubscriptionSummary;
  transactions: SubscriptionTransactionItem[];
  userSubscriptions: UserSubscriptionItem[];
};

export type TopupTransactionItem = {
  id: string;
  referenceId: string;
  paymentId: string | null;
  channelCode: string | null;
  amountPhp: number;
  creditsGranted: number;
  currency: string;
  status: string;
  description: string | null;
  createdAt: string;
  processedAt: string | null;
  userName: string;
  userHandle: string | null;
  userEmail: string | null;
  creditTransactionId?: string | null;
};

export type TopupSummary = {
  totalCount: number;
  paidCount: number;
  totalPaidPhp: number;
  totalCreditsIssued: number;
};

export type TopupAnalytics = {
  summary: TopupSummary;
  transactions: TopupTransactionItem[];
};

export type PlatformAnalytics = {
  lastUpdated: string;
  kpis: PlatformKpis;
  alerts: PlatformAlert[];
  growth: {
    signupsByWeek: SignupWeek[];
    signupsByMonth: { label: string; monthStart: string; value: number }[];
    engagementTrend: {
      label: string;
      weekStart: string;
      signups: number;
      estimatedDau: number;
      estimatedWau: number;
      estimatedMau: number;
    }[];
    activityTrend?: {
      label: string;
      weekStart: string;
      signups: number;
      tickets: number;
      reports: number;
      creditTransactions: number;
      listings: number;
    }[];
    weekOverWeekChange: number;
    trendLabel: string;
    newestMembers: {
      id: string | number;
      name: string;
      username: string;
      joinedAt: string | null;
      status: string;
      verification: string;
      merit: number;
    }[];
    retentionEstimate: number;
    avgSignupsPerWeek: number;
  };
  charts: {
    verificationMix: ChartSegment[];
    statusMix: ChartSegment[];
    meritTierBars: { label: string; value: number }[];
    creditBuckets: { label: string; count: number }[];
    groupSizeDistribution: { label: string; count: number }[];
    platformActivity?: ChartSegment[];
    listingStatusMix?: ChartSegment[];
  };
  memberDirectory: MemberDirectoryEntry[];
  audience: {
    totalMembers: number;
    activeMembers: number;
    byStatus: { label: string; count: number }[];
    byVerification: {
      fullyVerified: number;
      partiallyVerified: number;
      unverified: number;
      pendingReview: number;
    };
    meritTiers: { tier: string; range: string; count: number }[];
    topMembers: { rank: number; name: string; username: string; merit: number; credits: number; status: string }[];
    profileHealth: {
      withAvatar: number;
      withTagline: number;
      avatarRate: number;
      taglineRate: number;
      completeProfiles: number;
    };
    emailDomains: { domain: string; count: number }[];
  };
  community: {
    available: boolean;
    summary?: {
      total: number;
      active: number;
      inactive: number;
      totalMembers: number;
      avgMembersPerGroup: number;
    };
    discussions?: {
      total: number;
      sampledComments: number;
      avgComments: number;
    };
    participationRate?: number | null;
    topGroups?: { id: string; name: string; members: number; status: string }[];
    popularTags?: { tag: string; count: number }[];
    recentDiscussions?: { id: string; title: string; comments: number; authorId: number }[];
    message?: string;
  };
  economy: {
    totalMerit: number;
    totalCreditsInCirculation: number;
    avgCreditsPerMember: number;
    avgMeritPerMember: number;
    meritLeaders: { name: string; username: string; merit: number; credits: number }[];
    distribution: { tier: string; range: string; count: number }[];
    creditBuckets: { label: string; count: number }[];
    creditTransactions?: number;
    platformRevenue?: PlatformRevenue;
    platformPayout?: PlatformPayout;
    platformTransactions?: PlatformTransaction[];
    userTransactions?: UserTransaction[];
    subscriptionAnalytics?: SubscriptionAnalytics;
    topupAnalytics?: TopupAnalytics;
  };
  operations: {
    moderationTeam: { role: string; count: number; active: number }[];
    activeModerators: number;
    pendingVerifications: number;
    suspendedAccounts: number;
    bannedAccounts?: number;
    nonActiveAccounts: number;
    platformHealthScore: number;
    openTickets?: number;
    openReports?: number;
    openDisputes?: number;
    activeViolations?: number;
    pendingListings?: number;
  };
  insights: { id: string; title: string; detail: string; type: string }[];
  liveModules?: {
    teams: number;
    marketplaceListings: number;
    pendingListings: number;
    approvedListings: number;
    jobs: number;
    projects: number;
    creditTransactions: number;
    reports: number;
    openReports: number;
    disputes: number;
    openDisputes: number;
    tickets: number;
    openTickets: number;
    violations: number;
    activeViolations: number;
  };
  comingSoon: {
    title: string;
    modules: { name: string; metrics: string }[];
  };
};
