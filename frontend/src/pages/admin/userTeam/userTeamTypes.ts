/** A running automatic merit punishment, as staff desks show it. */
export type MeritPenaltyChip = {
  id: string;
  effect: string;
  label: string;
  ruleLabel?: string | null;
  startsAt?: string | null;
  endsAt: string | null;
  durationDays?: number | null;
  triggerMerit?: number | null;
  meritAtStart?: number | null;
};

export type TeamMember = {
  id: string | number;
  accountId?: string;
  name: string;
  email: string;
  username: string;
  avatarPath?: string | null;
  role: string;
  /** The member's own account standing (Active, Suspended, Banned, Locked). */
  accountStatus?: string;
  /** The team's leader (first active Owner). */
  isLeader?: boolean;
  /** The member's own Platform Merit (teams have none). */
  merit?: number;
  forumTimeout?: boolean;
  /** The running forum timeout was set together with this team. */
  forumTimeoutViaTeam?: boolean;
  meritPenalties?: MeritPenaltyChip[];
  activeWarnings?: number;
  openDisputes?: number;
};

/**
 * Members' merit added up. Teams have no Platform Merit of their own: `percent` is the members'
 * total out of 100 each (5 members at 100 → 100%; one at 50 → 90%).
 */
export type TeamMemberMerit = {
  total: number;
  /** 100 per member. */
  max: number;
  /** total / max, rounded down; null with no members. */
  percent: number | null;
  members: number;
  average: number | null;
  lowest: { accountId: string; name: string; merit: number } | null;
  /** Members at merit 60 or below (automatic punishments start there). */
  below60: number;
};

/** One member's line on the team record. */
export type TeamMemberRecord = {
  accountId: string;
  name: string;
  handle: string | null;
  role: string;
  isLeader: boolean;
  status: string;
  merit: number;
  forumTimeout: boolean;
  meritPenalties: MeritPenaltyChip[];
  activeWarnings: number;
  activeWarningPoints: number;
  totalWarnings: number;
  openDisputes: number;
  totalDisputes: number;
};

/** The team's leader (first active Owner): the default person a team penalty reaches. */
export type TeamLeader = {
  userId: string | null;
  accountId: string;
  name: string;
  username: string | null;
  email: string;
  avatarPath: string | null;
  status: string;
  suspensionEndsAt?: string | null;
  banEndsAt?: string | null;
  lockEndsAt?: string | null;
  merit: number | null;
  forumTimeout: boolean;
  /** The leader's current penalty was applied together with this team (lifting the team can lift it). */
  penaltyLinkedToTeam: boolean;
  meritPenalties?: MeritPenaltyChip[];
};

/** Team wallet: spendable, held by staff, escrow and the part owed to members from contract payouts. */
export type TeamWalletSummary = {
  walletId: string | null;
  available: number;
  held: number;
  escrow: number;
  contractReserved: number;
  unreserved: number;
  inactive: boolean;
};

export type TeamAttentionFlag = {
  id: string;
  label: string;
  tone: 'danger' | 'warning' | 'info';
};

export type PlatformTeam = {
  id: string;
  accountId: string;
  /** `standard` business team, or a `contractual` project workspace. */
  teamType?: 'standard' | 'contractual' | string;
  leader?: TeamLeader | null;
  wallet?: TeamWalletSummary;
  standing?: {
    suspensionEndsAt: string | null;
    banEndsAt: string | null;
    lockEndsAt: string | null;
  };
  attention?: TeamAttentionFlag[];
  name: string;
  logoInitial: string;
  avatarPath: string | null;
  handle: string | null;
  tagline: string | null;
  description: string | null;
  walletBalance: number;
  frozenBalance: number;
  leaderName: string;
  leaderId: string | number | null;
  leaderEmail: string;
  memberCount: number;
  members: TeamMember[];
  /** Members' merit added up (teams have no merit). */
  memberMerit?: TeamMemberMerit;
  /** Members with a running forum timeout, and how many of those were set with this team. */
  membersTimedOut?: number;
  membersTimedOutViaTeam?: number;
  email: string;
  verificationStatus: string;
  status: string;
  forumTimeout?: boolean;
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
  /** Signed from the account's side: a deduction or a hold is negative. */
  amount: number;
  label: string;
  timeAgo: string;
  positive: boolean;
  /** `hold` = credits moved to or from a staff hold; `neutral` = an old adjustment with no recorded sign. */
  tone?: 'positive' | 'negative' | 'neutral' | 'hold';
  /** Staff adjustment or hold reason. */
  detail?: string | null;
  /** When a hold was set to be released (at the time it was placed). */
  holdUntil?: string | null;
  createdAt?: string | null;
  /** The other side of the move (a member, a team, a client), when there is one. */
  counterparty?: { name: string; handle: string | null; isTeam: boolean } | null;
};

export type VerificationDetail = {
  status: string;
  hasVerificationUrl?: boolean;
  verificationUrl?: string | null;
  isTeam?: boolean;
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
  hasVerificationUrl?: boolean;
  verificationUrl?: string | null;
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

/** A member a dispute on a team record concerns: they filed it, or it is against them. */
export type DisputeParty = { accountId: string; name: string; side: 'filed' | 'against' };

export type ActiveDispute = {
  id?: string;
  title: string;
  handler?: string;
  against?: string;
  description: string;
  status: string;
  by?: string;
  timeAgo?: string;
  /** Team records: the members it concerns. */
  parties?: DisputeParty[];
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
  /** Members only. Null for teams: they have no Platform Merit. */
  merit?: number | null;
  /** Team records: the members' merit added up, and each member's line. */
  memberMerit?: TeamMemberMerit;
  members?: TeamMemberRecord[];
  /** Team records: active warnings across current members. */
  activeWarnings?: number;
  activeWarningPoints?: number;
  totalViolations: number;
  totalDisputes: number;
  openDisputes: number;
  activeDispute: ActiveDispute | null;
  activeDisputes: ActiveDispute[];
  violations: {
    id: string;
    violationId?: string;
    type: string;
    reason: string;
    points: number;
    /** Points it was issued with, when staff lifted some or all of them. */
    originalPoints?: number | null;
    by: string;
    timeAgo: string;
    expiresAt?: string | null;
    active?: boolean;
    status?: string;
    /** The account carrying the points (the team leader, for a warning issued through a team). */
    accountId?: string;
    issuedToName?: string | null;
    issuedToHandle?: string | null;
    /** Set when the warning was issued through a team and landed on one of its people. */
    viaTeamAccountId?: string | null;
    viaTeamName?: string | null;
    createdAt?: string | null;
    /** Team records: the member's role, and whether they lead the team. */
    memberRole?: string | null;
    isLeader?: boolean;
    /** Team records: issued through this team (not the member's own conduct elsewhere). */
    viaThisTeam?: boolean;
  }[];
  disputes: {
    id: string;
    title: string;
    description: string;
    status: string;
    by: string;
    timeAgo: string;
    against?: string;
    filedByName?: string | null;
    createdAt?: string | null;
    parties?: DisputeParty[];
  }[];
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
    totalLocked?: number;
    totalNeedsAttention?: number;
    totalLeaderRestricted?: number;
    totalWithoutLeader?: number;
    totalCreditsHeld?: number;
    totalTeamWalletBalance?: number;
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
  forumTimeout?: boolean;
  verificationStatus: string;
  joinedAt: string | null;
  lastSeenAt: string | null;
  hasAvatar: boolean;
  avatarPath: string | null;
  staffRole?: string | null;
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
  merit?: number;
  /** Automatic merit punishments running now (each on its own clock), strictest first. */
  meritPenalties?: {
    id: string;
    effect: string;
    label: string;
    ruleLabel?: string | null;
    startsAt?: string | null;
    endsAt: string | null;
    durationDays?: number | null;
    triggerMerit?: number | null;
    meritAtStart?: number | null;
  }[];
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

export type StatusBreakdown = {
  total: number;
  byStatus: Record<string, number>;
};

export type AccountStanding = {
  status: string;
  message: string | null;
  suspensionEndsAt: string | null;
  banEndsAt: string | null;
  lockEndsAt: string | null;
  forumTimeout: boolean;
  forumTimeoutEndsAt: string | null;
  warningPoints: number;
  warningBand: string;
  warningBandLabel: string | null;
  /** When the strictest running band's fixed clock ends (not when warnings expire). */
  warningBandEndsAt: string | null;
  /** Automatic mute from Platform Merit. */
  muted?: boolean;
  mutedUntil?: string | null;
  /** Every automatic merit punishment running now, strictest first. */
  meritPenalties?: {
    id: string;
    effect: string;
    label: string;
    ruleLabel?: string | null;
    startsAt?: string | null;
    endsAt: string | null;
    durationDays?: number | null;
    triggerMerit?: number | null;
    meritAtStart?: number | null;
  }[];
  merit: number;
  creditsFrozen: boolean;
  frozenCredits: number;
  creditsFrozenAt: string | null;
  creditsFrozenUntil: string | null;
  creditsFrozenReason: string | null;
  deactivatedAt: string | null;
  returnsToDeactivated: boolean;
};

export type TeamRosterMember = {
  userId: string;
  accountId: string;
  name: string;
  username: string | null;
  email: string | null;
  avatarPath: string | null;
  role: string;
  status: string;
  accountStatus: string | null;
  joinedAt: string | null;
  invitedAt: string | null;
  invitationExpiresAt: string | null;
  invitedByName: string | null;
};

/** Loaded on demand by GET /api/admin/accounts/:accountId/profile. */
export type AdminAccountProfile = {
  accountId: string;
  accountType: 'user' | 'team';
  handle: string | null;
  introduction: string | null;
  budgetCredits: number | null;
  createdAt: string | null;
  lastActivityAt: string | null;
  standing: AccountStanding | null;
  work: {
    jobs: StatusBreakdown;
    gigs: StatusBreakdown;
    proposals: StatusBreakdown;
    contractsAsClient: StatusBreakdown;
    contractsAsFreelancer: StatusBreakdown;
    listings: StatusBreakdown;
    followers: number;
    following: number;
    rating: { average: number; count: number };
  } | null;
  credits: {
    totalReceived: number;
    totalSent: number;
    contractEarnings: number;
    assetSales: number;
    assetSpending: number;
    cashedOut: number;
    lastTransactionAt: string | null;
  } | null;
  forum: {
    available: boolean;
    discussions: number;
    comments: number;
    likesReceived: number;
    savesReceived: number;
    lastPostAt: string | null;
  } | null;
  projects: { owned: number; member: number } | null;
  team: {
    settings: {
      visibility: string | null;
      joinPolicy: string | null;
      category: string | null;
      website: string | null;
      location: string | null;
      teamType: string | null;
      updatedAt: string | null;
    } | null;
    owner: TeamRosterMember | null;
    activeMemberCount: number;
    pendingInviteCount: number;
    members: TeamRosterMember[];
  } | null;
};

export type AccountTarget = {
  accountId: string;
  name: string;
  status?: string;
};
