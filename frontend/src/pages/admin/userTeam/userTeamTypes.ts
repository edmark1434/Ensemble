export type TeamMember = {
  id: string | number;
  name: string;
  email: string;
  username: string;
  role: string;
};

export type PlatformTeam = {
  id: string;
  accountId: string;
  name: string;
  logoInitial: string;
  avatarPath: string | null;
  handle: string | null;
  tagline: string | null;
  description: string | null;
  meritCredits: number;
  walletBalance: number;
  frozenBalance: number;
  leaderName: string;
  leaderId: string | number | null;
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
  documents: {
    id: string;
    name: string;
    type: string;
    pages: number | null;
    sizeMb: number;
    uploadedAt: string | null;
  }[];
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
  expiresAt: string | null;
  isExpired: boolean;
  applicationId: string;
  document: {
    name: string;
    uploadedBy: string;
    pages: number;
    sizeMb: number;
    uploadedAt: string | null;
  } | null;
  logs: { id: string; title: string; timeAgo: string; by: string; ref: string }[];
};

export type DiditVerificationDecision = {
  status: string | null;
  idVerification: {
    status: string | null;
    documentType: string | null;
    frontImage: string | null;
    backImage: string | null;
    portraitImage: string | null;
  } | null;
  liveness: {
    status: string | null;
    score: number | null;
    referenceImage: string | null;
    videoUrl: string | null;
  } | null;
  faceMatch: {
    status: string | null;
    score: number | null;
    sourceImage: string | null;
    targetImage: string | null;
  } | null;
  ipAnalysis: {
    status: string | null;
    ipAddress: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    deviceBrand: string | null;
    deviceModel: string | null;
    browser: string | null;
    operatingSystem: string | null;
    platform: string | null;
    isVpnOrTor: boolean;
    isDataCenter: boolean;
  } | null;
};

export type AdminVerificationDetails = {
  activity: 'none' | 'status_only' | 'details' | 'details_unavailable';
  accountType?: string | null;
  isTeam?: boolean;
  isVerified: boolean;
  verificationStatus: string;
  kycStatus: string | null;
  verificationSessionId?: string;
  verifiedAt: string | null;
  expiresAt: string | null;
  decision: DiditVerificationDecision | null;
  attachments?: Array<{
    fileId: string;
    name: string;
    path: string;
    mimeType: string;
    sizeBytes: number;
    documentType: string;
    index: number;
    isRequired: boolean;
    isLatest: boolean;
    submissionVersion: number;
  }>;
  businessDetails?: {
    businessType: string;
    registeredBusinessName: string;
    registrationNumber: string;
    registrationCountry: string;
    relationshipToBusiness: string;
    submittedByAccountId: string;
    submittedByName: string;
    submittedByHandle: string | null;
    submissionVersion: number;
  } | null;
};

export type ActiveDispute = {
  id?: string;
  title: string;
  handler?: string;
  against?: string;
  description: string;
  status: string;
  by?: string;
  timeAgo?: string;
};

export type AccountActivityItem = {
  id: string;
  accountId: string;
  accountName?: string | null;
  accountHandle?: string | null;
  action: string;
  eventCode: string;
  referenceTable?: string | null;
  referencePrefix?: string | null;
  referenceId?: string | null;
  actorStaffId?: string | null;
  actorAccountId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type TeamHistory = {
  summaryLabel: string;
  totalViolations: number;
  totalDisputes: number;
  openDisputes: number;
  activeDispute: ActiveDispute | null;
  activeDisputes: ActiveDispute[];
  violations: {
    id: string;
    type: string;
    reason: string;
    points: number;
    by: string;
    timeAgo: string;
    expiresAt?: string | null;
    active?: boolean;
    status?: string;
  }[];
  disputes: { id: string; title: string; description: string; status: string; by: string; timeAgo: string }[];
  activity?: AccountActivityItem[];
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

export type UserProfileDetails = {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffix: string | null;
  birthDate: string | null;
  country: string | null;
  address: string | null;
  zipCode: number | null;
  isEmailVerified: boolean;
  completedOnboarding: string | null;
  subscriptionPlan: string | null;
};

export type UserTeamMembership = {
  teamId: string;
  accountId: string;
  name: string;
  handle: string | null;
  avatarPath: string | null;
  role: string;
  membershipStatus: string;
  teamStatus: string;
  joinedAt: string | null;
};

export type PlatformUserAccount = {
  id: string | number;
  accountId: string;
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
  avatarPath: string | null;
  tagline: string | null;
  description: string | null;
  hasPaymentProfile: boolean;
  hasFirebase: boolean;
  walletBalance: number;
  frozenBalance: number;
  profile: UserProfileDetails;
  teams: UserTeamMembership[];
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

export type AccountTarget = {
  accountId: string;
  name: string;
  status?: string;
};
