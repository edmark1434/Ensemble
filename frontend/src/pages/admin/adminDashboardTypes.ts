export type PlatformKpis = {
  pendingVerifications: number;
  openDisputes: number;
  platformRevenueCredits: number;
  activeUsers: number;
  totalUsers: number;
  openTickets: number;
  pendingApproval: number;
  totalStaff: number;
  avgUserMerit: number;
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
  meritCredits: number;
  joinedAt: string | null;
  isAdmin: boolean;
};

export type PlatformUser = {
  id: number;
  name: string;
  email: string;
  username: string;
  displayName: string | null;
  status: string;
  meritCredits: number;
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
  meritCredits: number;
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
  meritChange: number;
  label: string;
  timeAgo: string;
  status: string;
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
  breakdowns: {
    staffByRole: { role: string; count: number; label: string }[];
    usersByStatus: { status: string; count: number }[];
  };
};
