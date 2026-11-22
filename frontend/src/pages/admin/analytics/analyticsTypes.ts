/** Mirrors `GET /api/admin/analytics-overview` (backend/services/AdminAnalyticsServices.js). */

export type RangeKey = '7d' | '30d' | '90d' | '12m' | 'ytd' | 'all' | 'custom';
export type Bucket = 'day' | 'week' | 'month';

export type Kpi = { value: number; previous: number | null; changePct: number | null };

export type AnalyticsRange = {
  key: RangeKey;
  from: string;
  to: string;
  days: number;
  bucket: Bucket;
  label: string;
  previous: { from: string; to: string } | null;
  today: string;
};

export type SeriesPoint = {
  start: string;
  end: string;
  partial: boolean;
  signups: number;
  /** Distinct members active in the bucket; null before activity tracking began. */
  active: number | null;
  tickets: number;
  reports: number;
  listings: number;
  topupCount: number;
  topupPhp: number;
  subscriptionPhp: number;
  feeCredits: number;
  cashoutPhp: number;
  topupCredits: number;
  cashoutFeePhp: number;
  /** Platform earnings for the bucket (see `PlatformEarnings`); cost and profit are null when costs could not be read. */
  revenuePhp: number;
  costPhp: number | null;
  profitPhp: number | null;
};

/** What Ensemble itself earned in a period (AdminAnalyticsServices `platformEarnings`). */
export type EarningsTotals = {
  revenuePhp: number;
  costPhp: number | null;
  profitPhp: number | null;
  /** Profit as a percentage of revenue; null when there was no revenue. */
  marginPct: number | null;
};

export type EarningsRevenue = {
  subscriptionsPhp: number;
  feesPhp: number;
  cashoutFeesPhp: number;
  topupMarkupPhp: number;
};

export type PlatformEarnings = EarningsTotals & {
  revenue: EarningsRevenue;
  costs: {
    grantsPhp: number;
    payoutsPhp: number;
    topupBonusPhp: number;
    deductionsPhp: number;
    grantCredits: number;
    payoutCredits: number;
    deductionCredits: number;
  } | null;
  previous: EarningsTotals | null;
};

export type MemberSummary = {
  total: number;
  status: { active: number; suspended: number; banned: number; locked: number; deactivated: number; other: number };
  verification: { verified: number; pending: number; unverified: number };
  profile: { withAvatar: number; withTagline: number; complete: number };
  newest: { accountId: string; name: string; handle: string | null; status: string; joinedAt: string }[];
  emailDomains: { domain: string; count: number }[];
};

export type CohortRow = {
  cohortStart: string;
  size: number;
  weeks: { week: number; active: number | null; rate: number | null }[];
};

export type Engagement =
  | { available: false; reason: 'not_migrated' | 'no_data' | 'error' | null }
  | {
      available: true;
      reason: null;
      trackingSince: string;
      partial: boolean;
      dau: number;
      wau: number;
      mau: number;
      stickiness: number | null;
      averageDaily: number;
      active: Kpi;
      returning: number;
      newActive: number;
      cohorts: CohortRow[];
    };

export type Community =
  | { available: false }
  | {
      available: true;
      groups: {
        total: number;
        active: number;
        inactive: number;
        memberships: number;
        averageSize: number;
        createdInPeriod: number;
        sizeDistribution: { label: string; count: number }[];
        top: { id: string; name: string; members: number; status: string }[];
        tags: { tag: string; count: number }[];
      };
      discussions: {
        total: number;
        inPeriod: number;
        previous: number | null;
        commentsInPeriod: number;
        commentersInPeriod: number;
        postersInPeriod: number;
        top: {
          id: string;
          title: string;
          comments: number;
          likes: number;
          createdAt: string | null;
          author: { name: string; handle: string | null };
        }[];
      };
    };

export type TopupBreakdown = {
  paidCount: number;
  paidPhp: number;
  creditsIssued: number;
  buyers: number;
  pendingCount: number;
  failedCount: number;
  byChannel: { channel: string; count: number; php: number }[];
};

export type PlanBreakdown = {
  planId: string;
  name: string;
  billingPeriod: string;
  pricePhp: number;
  paid: boolean;
  members: number;
  canceling: number;
  trialing: number;
  mrrPhp: number;
};

export type SubscriptionBreakdown = {
  activePaid: number;
  canceling: number;
  trialing: number;
  freeMembers: number;
  mrrPhp: number;
  plans: PlanBreakdown[];
  period: { started: number; canceled: number; paidInvoices: number; failedInvoices: number; upgradePayments: number };
};

export type FeeBreakdown = {
  netCredits: number;
  grossCredits: number;
  refundedCredits: number;
  byType: { type: string; count: number; grossCredits: number; refundedCredits: number; refundCount: number; netCredits: number }[];
};

export type CashoutBreakdown = {
  paidCount: number;
  paidCredits: number;
  paidPhp: number;
  feesPhp: number;
  averagePhp: number;
  earners: number;
  failedCount: number;
  failedCredits: number;
  inFlight: { count: number; credits: number; php: number; stale: number; oldestAt: string | null };
};

export type TicketStats = {
  open: number;
  unassigned: number;
  highPriority: number;
  oldestOpenAt: string | null;
  opened: number;
  resolved: number;
  medianFirstReplyHours: number | null;
  medianResolutionHours: number | null;
  satisfaction: number | null;
  ratings: number;
};

export type AnalyticsAlert = {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  detail: string;
  href: string | null;
};

export type PlatformAnalytics = {
  generatedAt: string;
  cached: boolean;
  range: AnalyticsRange;
  summary: {
    newMembers: Kpi;
    activeMembers: Kpi | null;
    topupRevenuePhp: Kpi;
    subscriptionRevenuePhp: Kpi;
    feeRevenueCredits: Kpi;
    cashoutsPaidPhp: Kpi;
    platformRevenuePhp: Kpi;
    /** Null when platform costs could not be read. */
    platformProfitPhp: Kpi | null;
    tickets: Kpi;
    reports: Kpi;
    disputes: Kpi;
    listings: Kpi;
  };
  series: SeriesPoint[];
  members: MemberSummary | null;
  engagement: Engagement;
  community: Community;
  money: {
    creditValuePhp: number;
    cash: { inPhp: number; outPhp: number; netPhp: number };
    earnings: PlatformEarnings;
    /** Everything recorded up to today, whatever the range. Null when it could not be read. */
    lifetime: (EarningsTotals & { revenue: EarningsRevenue }) | null;
    topups: TopupBreakdown | null;
    subscriptions: SubscriptionBreakdown | null;
    fees: FeeBreakdown | null;
    cashouts: CashoutBreakdown | null;
    credits: {
      circulating: number;
      spendable: number;
      held: number;
      platform: number;
      escrow: number;
      liabilityPhp: number;
      negativeWallets: number;
    } | null;
  };
  operations: {
    tickets: TicketStats | null;
    queues: {
      openReports: number;
      openDisputes: number;
      pendingListings: number;
      activeViolations: number;
      teams: number;
      pendingVerifications: number;
      cashoutsInFlight: number;
    } | null;
    staff: { role: string; count: number; active: number }[];
  };
  alerts: AnalyticsAlert[];
  problems: string[];
};

// ── Finance lists (`GET /api/admin/analytics/finance/:kind`) ────────────────

export type LedgerKind = 'topups' | 'invoices' | 'subscriptions' | 'cashouts';

export type MemberRef = { accountId: string | null; name: string; handle: string | null };

export type TopupRow = {
  id: string;
  referenceId: string;
  paymentId: string | null;
  channel: string | null;
  amountPhp: number;
  credits: number;
  currency: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
  member: MemberRef;
  email: string | null;
};

export type InvoiceRow = {
  id: string;
  cycleId: string | null;
  plan: string;
  amountPhp: number;
  status: string;
  attempts: number;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string;
  member: MemberRef;
  email: string | null;
};

export type SubscriptionRow = {
  id: string;
  plan: string;
  pricePhp: number;
  billingPeriod: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  startedAt: string;
  billedPhp: number;
  member: MemberRef;
  email: string | null;
};

export type CashoutRow = {
  id: string;
  referenceId: string;
  channel: string | null;
  accountNumber: string | null;
  accountName: string | null;
  credits: number;
  feePhp: number;
  netPhp: number;
  status: string;
  failureCode: string | null;
  createdAt: string;
  updatedAt: string | null;
  member: MemberRef;
};

export type LedgerPage<T> = {
  items: T[];
  total: number;
  sumPhp: number | null;
  page: number;
  limit: number;
  pages: number;
};

export type FinanceOptions = {
  plans: { planId: string; name: string; paid: boolean }[];
  topupChannels: string[];
  cashoutChannels: string[];
};
