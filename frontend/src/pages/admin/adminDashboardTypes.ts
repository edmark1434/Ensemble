export type PlatformKpis = {
  pendingVerifications: number;
  openDisputes: number;
  platformRevenueCredits: number;
  activeUsers: number;
  totalUsers: number;
  openTickets: number;
  pendingApproval: number;
  totalStaff: number;
  totalTeams?: number;
  forumGroups: number | null;
  forumDiscussions: number | null;
};

export type PlatformAlert = {
  id: string;
  message: string;
  severity: 'warning' | 'error' | 'info' | 'success';
};

export type StaffMember = {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
  roleLabel: string;
  status: string;
  joinedAt: string | null;
  isAdmin: boolean;
  /** Has a staff console open right now (recent request or heartbeat). */
  isOnline: boolean;
  /** Last console activity; null when never seen. */
  lastSeenAt: string | null;
};

export type PlatformUser = {
  id: number;
  name: string;
  email: string;
  username: string;
  displayName: string | null;
  status: string;
  joinedAt: string | null;
  hasAvatar: boolean;
  tagline: string | null;
};

export type VerificationItem = {
  id: number;
  userId: number | null;
  name: string;
  email: string;
  username: string;
  status: string;
  submittedAt: string | null;
  accountType: string;
};

export type ActivityEvent = {
  id: string;
  title: string;
  detail: string;
  timestamp: string | null;
  category: string;
};

export type EconomyEvent = {
  id: number;
  rank: number;
  name: string;
  username: string;
  label: string;
  timeAgo: string;
  status: string;
  walletId: string | null;
  /** Spendable + held credits. */
  credits: number;
  heldCredits: number;
};

/** Live member accounts (no staff, teams or deleted accounts), for the Members card. */
export type MemberHealth = {
  total: number;
  status: { active: number; suspended: number; banned: number; locked: number; deactivated: number; other: number };
  verification: { verified: number; pending: number; unverified: number };
  profile: { withAvatar: number; withTagline: number; complete: number };
  /** Null when this week's figures could not be read. */
  pulse: {
    newThisWeek: number;
    newLastWeek: number;
    activeThisWeek: number;
    withActiveWarnings: number;
    forumTimeouts: number;
  } | null;
};

export type AdminDashboardData = {
  lastUpdated: string;
  kpis: PlatformKpis;
  alerts: PlatformAlert[];
  staffRoster: StaffMember[];
  platformUsers: PlatformUser[];
  verificationQueue: VerificationItem[];
  recentSignups: { id: number; name: string; email: string; username: string; status: string; joinedAt: string | null }[];
  recentActivity: ActivityEvent[];
  economyFeed: EconomyEvent[];
  /** Null when the member summary could not be read; the card falls back to `usersByStatus`. */
  memberHealth?: MemberHealth | null;
  breakdowns: {
    staffByRole: { role: string; count: number; label: string }[];
    usersByStatus: { status: string; count: number }[];
  };
};
