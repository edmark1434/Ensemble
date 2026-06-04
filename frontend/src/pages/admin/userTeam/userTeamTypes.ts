export type TeamMember = {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
};

export type PlatformTeam = {
  id: string;
  name: string;
  logoInitial: string;
  leaderName: string;
  leaderId: number;
  leaderEmail: string;
  memberCount: number;
  members: TeamMember[];
  email: string;
  verificationStatus: string;
  status: string;
  lastSeenAt: string | null;
  createdAt: string | null;
  stats: {
    totalAssets: number;
    totalCredits: number;
    totalJobs: number;
    totalJobEarnings: number;
    totalRevenue: number;
    totalPosts: number;
    totalReactions: number;
    totalComments: number;
  };
  documents: { id: string; name: string; type: string; pages: number | null; sizeMb: number; uploadedAt: string | null }[];
  creditActivity: CreditActivityItem[];
  verification: VerificationDetail;
  history: TeamHistory;
};

export type CreditActivityItem = {
  id: string;
  type: string;
  amount: number;
  label: string;
  timeAgo: string;
  positive: boolean;
};

export type VerificationDetail = {
  status: string;
  reverificationDueDays: number | null;
  applicationId: string;
  document: {
    name: string;
    uploadedBy: string;
    pages: number;
    sizeMb: number;
    uploadedAt: string | null;
  };
  logs: { id: string; title: string; timeAgo: string; by: string; ref: string }[];
};

export type TeamHistory = {
  summaryLabel: string;
  totalViolations: number;
  totalDisputes: number;
  openDisputes: number;
  activeDispute: {
    title: string;
    handler: string;
    against: string;
    reason: string;
    status: string;
  } | null;
  violations: { id: string; title: string; reason: string; points: number; by: string; timeAgo: string }[];
  disputes: { id: string; title: string; reason: string; status: string; by: string; timeAgo: string }[];
};

export type TeamManagementData = {
  stats: {
    totalSuspended: number;
    totalBanned: number;
    totalTeams: number;
    totalActive: number;
    totalVerifiedBusinesses: number;
    totalUnverifiedBusiness: number;
    totalPendingVerification: number;
  };
  teams: PlatformTeam[];
  lastUpdated: string;
};

export type PlatformUserAccount = {
  id: number;
  accountId: number;
  profileId: string;
  name: string;
  email: string;
  username: string;
  displayName: string | null;
  status: string;
  meritCredits: number;
  verificationStatus: string;
  joinedAt: string | null;
  lastSeenAt: string | null;
  hasAvatar: boolean;
  tagline: string | null;
  hasPaymentProfile: boolean;
  hasFirebase: boolean;
  creditActivity: CreditActivityItem[];
  verification: VerificationDetail;
  history: TeamHistory;
  stats: {
    totalAssets: number;
    totalCredits: number;
    totalJobs: number;
    totalPosts: number;
  };
};

export type UserManagementData = {
  stats: {
    totalSuspended: number;
    totalBanned: number;
    totalUsers: number;
    totalActive: number;
    totalVerified: number;
    totalUnverified: number;
    totalPendingVerification: number;
  };
  users: PlatformUserAccount[];
  lastUpdated: string;
};
