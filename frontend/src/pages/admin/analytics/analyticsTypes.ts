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
