const redisClient = require('../lib/Redis');
const repo = require('../repositories/AdminAnalyticsRepositories');
const { fetchSupply } = require('../repositories/AdminEconomyRepositories');
const { getSectionValue } = require('../repositories/AdminSettingsRepositories');

class AnalyticsServiceError extends Error {
  constructor(message, statusCode = 400, code = 'ANALYTICS_INVALID_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Admin → Analytics.
 *
 * The overview covers one date range (preset or custom) and compares it with the period of
 * the same length right before it. Results are cached in Redis for 60 seconds per range
 * (`analytics:overview:v3:<from>:<to>:<bucket>`); `refresh=1` recomputes. Nothing writes
 * analytics data, so there is nothing to invalidate.
 */

const CACHE_PREFIX = 'analytics:overview:v3';
const CACHE_TTL_SECONDS = 60;
const MAX_CUSTOM_DAYS = 3 * 366;
const RANGE_KEYS = ['7d', '30d', '90d', '12m', 'ytd', 'all', 'custom'];
const BUCKETS = ['day', 'week', 'month'];
const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Calendar math on YYYY-MM-DD strings (UTC, so no DST surprises) ───────────

function parseDay(value) {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

function formatDay(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(day, n) {
  return formatDay(new Date(parseDay(day).getTime() + n * DAY_MS));
}

function daysBetween(from, to) {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / DAY_MS);
}

function startOfMonth(day, monthsBack = 0) {
  const d = parseDay(day);
  return formatDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsBack, 1)));
}

function maxDay(a, b) {
  return a > b ? a : b;
}

function minDay(a, b) {
  return a < b ? a : b;
}

const LABEL_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function rangeLabel(key, from, to) {
  const presets = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    '12m': 'Last 12 months',
    ytd: 'Year to date',
    all: 'All time',
  };
  return presets[key] || `${LABEL_FMT.format(parseDay(from))} – ${LABEL_FMT.format(parseDay(to))}`;
}

function defaultBucket(days) {
  if (days <= 31) return 'day';
  if (days <= 183) return 'week';
  return 'month';
}

function bucketAllowed(bucket, days) {
  if (bucket === 'day') return days <= 92;
  if (bucket === 'week') return days <= 3 * 366;
  return true;
}

/**
 * Turns `range`, `from`, `to`, `bucket` query values into inclusive bounds. Throws a 400 on
 * anything malformed rather than silently showing a different period.
 */
function resolveRange(query, calendar) {
  const today = calendar.today;
  const key = query.range == null || query.range === '' ? '30d' : String(query.range);
  if (!RANGE_KEYS.includes(key)) throw new AnalyticsServiceError('Unknown date range.');

  let from;
  let to = today;
  switch (key) {
    case '7d':
      from = addDays(today, -6);
      break;
    case '30d':
      from = addDays(today, -29);
      break;
    case '90d':
      from = addDays(today, -89);
      break;
    case '12m':
      from = startOfMonth(today, 11);
      break;
    case 'ytd':
      from = `${today.slice(0, 4)}-01-01`;
      break;
    case 'all':
      from = calendar.firstSignup && calendar.firstSignup < today ? calendar.firstSignup : addDays(today, -29);
      break;
    case 'custom': {
      if (!parseDay(query.from) || !parseDay(query.to)) {
        throw new AnalyticsServiceError('Pick a start and end date (YYYY-MM-DD).');
      }
      from = query.from;
      to = minDay(query.to, today);
      if (from > to) throw new AnalyticsServiceError('The start date must be on or before the end date.');
      if (daysBetween(from, to) + 1 > MAX_CUSTOM_DAYS) {
        throw new AnalyticsServiceError('Custom ranges can cover at most three years.');
      }
      break;
    }
    default:
      break;
  }

  const days = daysBetween(from, to) + 1;
  let bucket = defaultBucket(days);
  if (query.bucket != null && query.bucket !== '') {
    if (!BUCKETS.includes(query.bucket)) throw new AnalyticsServiceError('Unknown chart interval.');
    if (!bucketAllowed(query.bucket, days)) {
      throw new AnalyticsServiceError(
        query.bucket === 'day' ? 'Daily points are available for ranges up to 92 days.' : 'Weekly points are available for ranges up to three years.'
      );
    }
    bucket = query.bucket;
  }

  const previous =
    key === 'all' ? null : { from: addDays(from, -days), to: addDays(from, -1) };

  return { key, from, to, days, bucket, previous, today, label: rangeLabel(key, from, to) };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function kpi(value, previous) {
  const prev = previous == null ? null : previous;
  let changePct = null;
  if (prev != null && prev !== 0) changePct = Math.round(((value - prev) / Math.abs(prev)) * 1000) / 10;
  return { value, previous: prev, changePct };
}

function round(value, places = 1) {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

function bucketEnd(start, bucket) {
  if (bucket === 'day') return start;
  if (bucket === 'week') return addDays(start, 6);
  const d = parseDay(start);
  return formatDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

function plural(n, one, many = `${one}s`) {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

// ── Platform earnings ───────────────────────────────────────────────────────

/** Earliest day the lifetime totals read from (before any Ensemble record). */
const LIFETIME_FROM = '2000-01-01';

/**
 * What Ensemble itself earned: revenue it keeps, minus credits it handed out without being
 * paid. `totals` is a `fetchPeriodTotals` (or series) row, `costs` a `fetchPlatformCosts`
 * row or null when that read failed (costs and profit are then null). Credit amounts are
 * valued at today's credit value. Payment-provider charges and running costs are not
 * recorded, so they are not taken off.
 */
function platformEarnings(totals, costs, creditValuePhp) {
  const t = totals || {};
  const topupMarginPhp = (t.topupPhp || 0) - (t.topupCredits || 0) * creditValuePhp;
  const revenue = {
    subscriptionsPhp: round(t.subscriptionPhp || 0, 2),
    feesPhp: round((t.feeCredits || 0) * creditValuePhp, 2),
    cashoutFeesPhp: round(t.cashoutFeePhp || 0, 2),
    topupMarkupPhp: round(Math.max(0, topupMarginPhp), 2),
  };
  const revenuePhp = round(revenue.subscriptionsPhp + revenue.feesPhp + revenue.cashoutFeesPhp + revenue.topupMarkupPhp, 2);
  if (!costs) {
    return { revenuePhp, revenue, costPhp: null, costs: null, profitPhp: null, marginPct: null };
  }
  const costLines = {
    grantsPhp: round(costs.grants * creditValuePhp, 2),
    payoutsPhp: round(costs.payouts * creditValuePhp, 2),
    topupBonusPhp: round(Math.max(0, -topupMarginPhp), 2),
    deductionsPhp: round(costs.deductions * creditValuePhp, 2),
    grantCredits: costs.grants,
    payoutCredits: costs.payouts,
    deductionCredits: costs.deductions,
  };
  const costPhp = round(costLines.grantsPhp + costLines.payoutsPhp + costLines.topupBonusPhp - costLines.deductionsPhp, 2);
  const profitPhp = round(revenuePhp - costPhp, 2);
  return {
    revenuePhp,
    revenue,
    costPhp,
    costs: costLines,
    profitPhp,
    marginPct: revenuePhp > 0 ? round((profitPhp / revenuePhp) * 100, 1) : null,
  };
}

// ── Engagement ──────────────────────────────────────────────────────────────

async function loadEngagement(range, problems) {
  let since;
  try {
    since = await repo.fetchTrackingSince();
  } catch (err) {
    console.error('Analytics activity tracking unavailable:', err.message);
    return { available: false, reason: 'not_migrated', activeByBucket: new Map() };
  }
  if (!since) return { available: false, reason: 'no_data', activeByBucket: new Map() };

  const prev = range.previous;
  // A previous period that starts before tracking began would compare against missing days.
  const comparable = prev && prev.from >= since;
  const [totals, activeByBucket, cohorts] = await Promise.all([
    repo.fetchEngagementTotals({
      from: range.from,
      to: range.to,
      prevFrom: comparable ? prev.from : null,
      prevTo: comparable ? prev.to : null,
    }),
    repo.fetchActiveSeries(range).catch((err) => {
      problems.push('activity series');
      console.error('Analytics active series failed:', err.message);
      return new Map();
    }),
    repo.fetchWeeklyCohorts(8).catch((err) => {
      problems.push('cohorts');
      console.error('Analytics cohorts failed:', err.message);
      return [];
    }),
  ]);

  const today = range.today;
  const tracked30 = Math.min(30, daysBetween(since, today) + 1);
  const avgDau30 = tracked30 > 0 ? totals.memberDays30 / tracked30 : 0;
  const trackedStart = maxDay(range.from, since);
  const trackedEnd = minDay(range.to, today);
  const trackedDaysInPeriod = trackedStart <= trackedEnd ? daysBetween(trackedStart, trackedEnd) + 1 : 0;

  return {
    available: true,
    reason: null,
    trackingSince: since,
    partial: since > range.from,
    dau: totals.dau,
    wau: totals.wau,
    mau: totals.mau,
    stickiness: totals.mau ? round(avgDau30 / totals.mau, 3) : null,
    averageDaily: trackedDaysInPeriod ? round(totals.memberDaysInPeriod / trackedDaysInPeriod, 1) : 0,
    active: kpi(totals.inPeriod, totals.inPrevious),
    returning: totals.returningInPeriod,
    newActive: Math.max(0, totals.inPeriod - totals.returningInPeriod),
    cohorts: cohorts.map((c) => {
      const weeks = [];
      for (let k = 0; addDays(c.cohortStart, 7 * k) <= today; k += 1) {
        const weekStart = addDays(c.cohortStart, 7 * k);
        const trackedWeek = addDays(weekStart, 6) >= since;
        const active = c.activeByWeek[k] || 0;
        weeks.push({
          week: k,
          active: trackedWeek ? active : null,
          rate: trackedWeek && c.size ? round(active / c.size, 3) : null,
        });
      }
      return { cohortStart: c.cohortStart, size: c.size, weeks };
    }),
    activeByBucket,
  };
}

// ── Alerts ──────────────────────────────────────────────────────────────────

function buildAlerts({ members, tickets, queues, cashouts, subscriptions, supply, community, engagement, problems }) {
  const alerts = [];
  const push = (alert) => alerts.push(alert);

  if (problems.length) {
    push({
      id: 'problems',
      severity: 'warning',
      title: 'Some figures could not be loaded',
      detail: `${problems.join(', ')}. Those sections show zero until the next refresh succeeds.`,
      href: null,
    });
  }
  if (tickets && tickets.open > 0) {
    push({
      id: 'tickets',
      severity: tickets.highPriority > 0 || tickets.unassigned > 0 ? 'warning' : 'info',
      title: `${plural(tickets.open, 'open support ticket')}`,
      detail: `${tickets.unassigned.toLocaleString('en-US')} unassigned · ${tickets.highPriority.toLocaleString('en-US')} high priority`,
      href: '/admin/ticket-management?tab=tickets',
    });
  }
  if (queues && queues.openReports > 0) {
    push({
      id: 'reports',
      severity: 'warning',
      title: `${plural(queues.openReports, 'open report')}`,
      detail: 'Member reports waiting for a moderator decision.',
      href: '/admin/moderation?tab=cases&queue=reports',
    });
  }
  if (queues && queues.openDisputes > 0) {
    push({
      id: 'disputes',
      severity: 'warning',
      title: `${plural(queues.openDisputes, 'open dispute')}`,
      detail: 'Contract and transaction disputes that are not closed.',
      href: '/admin/moderation?tab=cases&queue=disputes',
    });
  }
  if (queues && queues.pendingListings > 0) {
    push({
      id: 'listings',
      severity: 'info',
      title: `${plural(queues.pendingListings, 'listing')} awaiting approval`,
      detail: 'Marketplace submissions in the review queue.',
      href: '/admin/moderation?tab=cases&queue=listings',
    });
  }
  if (members && members.verification.pending > 0) {
    push({
      id: 'identity',
      severity: 'info',
      title: `${plural(members.verification.pending, 'identity check')} pending`,
      detail: 'Members waiting on verification review.',
      href: '/admin/moderation?tab=cases&queue=identity',
    });
  }
  if (cashouts && cashouts.inFlight.stale > 0) {
    push({
      id: 'cashouts',
      severity: 'warning',
      title: `${plural(cashouts.inFlight.stale, 'cashout')} waiting over 24 hours`,
      detail: `${cashouts.inFlight.count.toLocaleString('en-US')} in flight in total. Check the payout provider.`,
      href: '/admin/credit-economy',
    });
  }
  if (subscriptions && subscriptions.period.failedInvoices > 0) {
    push({
      id: 'invoices',
      severity: 'info',
      title: `${plural(subscriptions.period.failedInvoices, 'subscription charge')} failed in this period`,
      detail: 'Failed renewals end the subscription. See Money → Invoices.',
      href: '/admin/analytics?tab=money&ledger=invoices',
    });
  }
  if (supply && supply.negativeWallets > 0) {
    push({
      id: 'negative-wallets',
      severity: 'warning',
      title: `${plural(supply.negativeWallets, 'wallet')} with a negative balance`,
      detail: 'Balances below zero should not happen. Review them on the Credits desk.',
      href: '/admin/credit-economy?tab=wallets',
    });
  }
  if (!community) {
    push({
      id: 'community',
      severity: 'info',
      title: 'Forum data unavailable',
      detail: 'MongoDB did not answer, so community figures are missing.',
      href: null,
    });
  }
  if (!engagement.available) {
    push({
      id: 'activity',
      severity: 'info',
      title: engagement.reason === 'not_migrated' ? 'Activity tracking is not set up' : 'No member activity recorded yet',
      detail:
        engagement.reason === 'not_migrated'
          ? 'Run the database migrations to start counting daily and monthly active members.'
          : 'Active-member figures start once members sign in after this update.',
      href: null,
    });
  }
  const order = { warning: 0, info: 1 };
  return alerts.sort((a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2));
}

// ── Overview ────────────────────────────────────────────────────────────────

async function assembleOverview(range) {
  const problems = [];
  const safe = (name, promise, fallback = null) =>
    promise.catch((err) => {
      problems.push(name);
      console.error(`Analytics ${name} failed:`, err.message);
      return fallback;
    });

  const prev = range.previous;
  const [
    members,
    newest,
    emailDomains,
    staff,
    current,
    previous,
    series,
    topups,
    subscriptions,
    fees,
    cashouts,
    tickets,
    queues,
    community,
    supply,
    economy,
    engagement,
    costs,
    previousCosts,
    lifetimeTotals,
    lifetimeCosts,
  ] = await Promise.all([
    safe('members', repo.fetchMemberSummary()),
    safe('newest members', repo.fetchNewestMembers(8), []),
    safe('email domains', repo.fetchEmailDomains(6), []),
    safe('staff', repo.fetchStaffRoles(), []),
    safe('period totals', repo.fetchPeriodTotals(range)),
    prev ? safe('previous period', repo.fetchPeriodTotals(prev)) : Promise.resolve(null),
    safe('series', repo.fetchSeries(range), []),
    safe('top-ups', repo.fetchTopupBreakdown(range)),
    safe('subscriptions', repo.fetchSubscriptionBreakdown(range)),
    safe('fees', repo.fetchFeeBreakdown(range)),
    safe('cashouts', repo.fetchCashoutBreakdown(range)),
    safe('tickets', repo.fetchTicketStats(range)),
    safe('queues', repo.fetchQueueCounts()),
    repo
      .fetchCommunityStats({ from: range.from, to: range.to, prevFrom: prev?.from, prevTo: prev?.to })
      .catch((err) => {
        console.error('Analytics community failed:', err.message);
        return null;
      }),
    safe('credit supply', fetchSupply({ includeStaff: false })),
    getSectionValue('economy').catch(() => null),
    loadEngagement(range, problems).catch((err) => {
      problems.push('activity');
      console.error('Analytics engagement failed:', err.message);
      return { available: false, reason: 'error', activeByBucket: new Map() };
    }),
    safe('platform costs', repo.fetchPlatformCosts(range)),
    prev ? safe('previous platform costs', repo.fetchPlatformCosts({ ...prev, bucket: 'month' })) : Promise.resolve(null),
    range.key === 'all'
      ? Promise.resolve(null)
      : safe('lifetime totals', repo.fetchPeriodTotals({ from: LIFETIME_FROM, to: range.today })),
    range.key === 'all'
      ? Promise.resolve(null)
      : safe('lifetime costs', repo.fetchPlatformCosts({ from: LIFETIME_FROM, to: range.today, bucket: 'month' })),
  ]);

  if (community?.discussions?.top?.length) {
    const names = await repo.fetchAuthorNames(community.discussions.top.map((d) => d.authorId)).catch(() => new Map());
    community.discussions.top = community.discussions.top.map(({ authorId, ...d }) => ({
      ...d,
      author: (authorId && names.get(authorId)) || { name: 'Member', handle: null },
    }));
  }

  const creditValuePhp = Number(economy?.creditValuePhp) > 0 ? Number(economy.creditValuePhp) : 1;
  const totals = current || {};
  const before = previous || null;
  const pick = (field) => kpi(totals[field] ?? 0, before ? before[field] ?? 0 : null);
  const { activeByBucket, ...engagementData } = engagement;
  const since = engagement.trackingSince || null;

  const earnings = platformEarnings(current, costs, creditValuePhp);
  const previousEarnings = before ? platformEarnings(before, prev ? previousCosts : null, creditValuePhp) : null;
  const lifetime =
    range.key === 'all'
      ? earnings
      : lifetimeTotals
        ? platformEarnings(lifetimeTotals, lifetimeCosts, creditValuePhp)
        : null;

  const seriesRows = series.map((row) => {
    const end = bucketEnd(row.start, range.bucket);
    const bucketCosts = costs ? costs.byBucket.get(row.start) || { grants: 0, deductions: 0, payouts: 0 } : null;
    const bucketEarnings = platformEarnings(row, bucketCosts, creditValuePhp);
    return {
      ...row,
      end,
      partial: row.start < range.from || end > range.to,
      active: engagement.available && since && end >= since ? activeByBucket.get(row.start) || 0 : null,
      revenuePhp: bucketEarnings.revenuePhp,
      costPhp: bucketEarnings.costPhp,
      profitPhp: bucketEarnings.profitPhp,
    };
  });

  const cashIn = (totals.topupPhp || 0) + (totals.subscriptionPhp || 0);
  const circulating = supply ? supply.circulating : 0;

  const data = {
    generatedAt: new Date().toISOString(),
    cached: false,
    range: {
      key: range.key,
      from: range.from,
      to: range.to,
      days: range.days,
      bucket: range.bucket,
      label: range.label,
      previous: prev,
      today: range.today,
    },
    summary: {
      newMembers: pick('signups'),
      activeMembers: engagement.available ? engagement.active : null,
      topupRevenuePhp: pick('topupPhp'),
      subscriptionRevenuePhp: pick('subscriptionPhp'),
      feeRevenueCredits: pick('feeCredits'),
      cashoutsPaidPhp: pick('cashoutPhp'),
      platformRevenuePhp: kpi(earnings.revenuePhp, previousEarnings ? previousEarnings.revenuePhp : null),
      platformProfitPhp:
        earnings.profitPhp == null ? null : kpi(earnings.profitPhp, previousEarnings ? previousEarnings.profitPhp : null),
      tickets: pick('tickets'),
      reports: pick('reports'),
      disputes: pick('disputes'),
      listings: pick('listings'),
    },
    series: seriesRows,
    members: members
      ? { ...members, newest, emailDomains }
      : null,
    engagement: engagementData,
    community: community ? { available: true, ...community } : { available: false },
    money: {
      creditValuePhp,
      cash: {
        inPhp: round(cashIn, 2),
        outPhp: totals.cashoutPhp || 0,
        netPhp: round(cashIn - (totals.cashoutPhp || 0), 2),
      },
      earnings: {
        ...earnings,
        previous: previousEarnings
          ? {
              revenuePhp: previousEarnings.revenuePhp,
              costPhp: previousEarnings.costPhp,
              profitPhp: previousEarnings.profitPhp,
              marginPct: previousEarnings.marginPct,
            }
          : null,
      },
      lifetime: lifetime
        ? {
            revenuePhp: lifetime.revenuePhp,
            costPhp: lifetime.costPhp,
            profitPhp: lifetime.profitPhp,
            marginPct: lifetime.marginPct,
            revenue: lifetime.revenue,
          }
        : null,
      topups,
      subscriptions,
      fees,
      cashouts,
      credits: supply
        ? {
            circulating,
            spendable: supply.spendable,
            held: supply.held,
            platform: supply.platform,
            escrow: supply.escrow,
            liabilityPhp: round(circulating * creditValuePhp, 2),
            negativeWallets: supply.negativeWallets,
          }
        : null,
    },
    operations: {
      tickets,
      queues: queues
        ? { ...queues, pendingVerifications: members?.verification.pending ?? 0, cashoutsInFlight: cashouts?.inFlight.count ?? 0 }
        : null,
      staff,
    },
    alerts: [],
    problems,
  };
  data.alerts = buildAlerts({
    members,
    tickets,
    queues,
    cashouts,
    subscriptions,
    supply,
    community,
    engagement,
    problems,
  });
  return data;
}

const inflight = new Map();

async function getAdminAnalyticsOverviewService(query = {}) {
  const calendar = await repo.fetchCalendar();
  const range = resolveRange(query, calendar);
  const key = `${CACHE_PREFIX}:${range.key}:${range.from}:${range.to}:${range.bucket}`;
  const refresh = query.refresh === '1' || query.refresh === 'true';

  if (!refresh) {
    try {
      const cached = await redisClient.get(key);
      if (cached) return { ...JSON.parse(cached), cached: true };
    } catch {
      // Cache miss or Redis down: compute from the database.
    }
  }

  // Concurrent requests for the same range share one computation.
  if (inflight.has(key)) return inflight.get(key);
  const task = assembleOverview(range)
    .then(async (data) => {
      // A partial result (a section failed) is not cached, so the next load retries.
      if (!data.problems.length) {
        await redisClient.set(key, JSON.stringify(data), { EX: CACHE_TTL_SECONDS }).catch(() => {});
      }
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, task);
  return task;
}

// ── Finance lists ───────────────────────────────────────────────────────────

const LISTS = {
  topups: {
    load: repo.listTopups,
    statuses: Object.keys(repo.TOPUP_STATUSES),
    dated: true,
    channel: true,
    filename: 'top-ups',
    columns: [
      ['Date', (r) => r.createdAt],
      ['Reference', (r) => r.referenceId],
      ['Payment ID', (r) => r.paymentId],
      ['Member', (r) => r.member.name],
      ['Handle', (r) => r.member.handle],
      ['Email', (r) => r.email],
      ['Channel', (r) => r.channel],
      ['Amount (PHP)', (r) => r.amountPhp.toFixed(2)],
      ['Credits', (r) => r.credits],
      ['Status', (r) => r.status],
      ['Processed at', (r) => r.processedAt],
    ],
  },
  invoices: {
    load: repo.listSubscriptionInvoices,
    statuses: Object.keys(repo.INVOICE_STATUSES),
    dated: true,
    plan: true,
    filename: 'subscription-invoices',
    columns: [
      ['Date', (r) => r.paidAt || r.failedAt || r.createdAt],
      ['Member', (r) => r.member.name],
      ['Handle', (r) => r.member.handle],
      ['Email', (r) => r.email],
      ['Plan', (r) => r.plan],
      ['Amount (PHP)', (r) => r.amountPhp.toFixed(2)],
      ['Status', (r) => r.status],
      ['Attempts', (r) => r.attempts],
      ['Period start', (r) => r.periodStart],
      ['Period end', (r) => r.periodEnd],
    ],
  },
  subscriptions: {
    load: repo.listSubscriptions,
    statuses: ['active', 'canceling', 'trial', 'ended'],
    plan: true,
    filename: 'subscriptions',
    columns: [
      ['Started', (r) => r.startedAt],
      ['Member', (r) => r.member.name],
      ['Handle', (r) => r.member.handle],
      ['Email', (r) => r.email],
      ['Plan', (r) => r.plan],
      ['Price (PHP)', (r) => r.pricePhp.toFixed(2)],
      ['Billing', (r) => r.billingPeriod],
      ['Status', (r) => r.status],
      ['Cancels at period end', (r) => (r.cancelAtPeriodEnd ? 'Yes' : 'No')],
      ['Next billing', (r) => r.nextBillingAt],
      ['Billed total (PHP)', (r) => r.billedPhp.toFixed(2)],
    ],
  },
  cashouts: {
    load: repo.listCashouts,
    statuses: Object.keys(repo.CASHOUT_STATUSES),
    dated: true,
    channel: true,
    filename: 'cashouts',
    columns: [
      ['Requested', (r) => r.createdAt],
      ['Reference', (r) => r.referenceId],
      ['Member', (r) => r.member.name],
      ['Handle', (r) => r.member.handle],
      ['Channel', (r) => r.channel],
      ['Account', (r) => r.accountNumber],
      ['Account name', (r) => r.accountName],
      ['Credits', (r) => r.credits],
      ['Fee (PHP)', (r) => r.feePhp.toFixed(2)],
      ['Net (PHP)', (r) => r.netPhp.toFixed(2)],
      ['Status', (r) => r.status],
      ['Failure code', (r) => r.failureCode],
    ],
  },
};

const CSV_ROW_LIMIT = 5000;

function intParam(value, fallback, min, max) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function parseListQuery(kind, query) {
  const spec = LISTS[kind];
  if (!spec) throw new AnalyticsServiceError('Unknown finance list.', 404, 'ANALYTICS_UNKNOWN_LIST');

  const page = intParam(query.page, 1, 1, 100_000);
  const limit = intParam(query.limit, 25, 1, 100);
  if (page == null || limit == null) throw new AnalyticsServiceError('Invalid page or page size.');

  const status = query.status == null || query.status === '' || query.status === 'all' ? null : String(query.status);
  if (status && !spec.statuses.includes(status)) throw new AnalyticsServiceError('Unknown status filter.');

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search.length > 100) throw new AnalyticsServiceError('Search is limited to 100 characters.');

  let channel = null;
  if (spec.channel && query.channel && query.channel !== 'all') {
    if (!/^[A-Za-z0-9_]{1,40}$/.test(String(query.channel))) throw new AnalyticsServiceError('Unknown channel.');
    channel = String(query.channel);
  }

  let planId = null;
  if (spec.plan && query.plan && query.plan !== 'all') {
    if (!UUID.test(String(query.plan))) throw new AnalyticsServiceError('Unknown plan.');
    planId = String(query.plan);
  }

  let from = null;
  let to = null;
  if (spec.dated) {
    if (query.from) {
      if (!parseDay(query.from)) throw new AnalyticsServiceError('Invalid start date.');
      from = query.from;
    }
    if (query.to) {
      if (!parseDay(query.to)) throw new AnalyticsServiceError('Invalid end date.');
      to = query.to;
    }
    if (from && to && from > to) throw new AnalyticsServiceError('The start date must be on or before the end date.');
  }

  return {
    spec,
    filters: {
      status,
      search: search || null,
      channel,
      planId,
      from,
      to,
      includeFree: query.includeFree === '1' || query.includeFree === 'true',
    },
    page,
    limit,
  };
}

async function listFinanceRecordsService(kind, query = {}) {
  const { spec, filters, page, limit } = parseListQuery(kind, query);
  const result = await spec.load({ ...filters, limit, offset: (page - 1) * limit });
  return {
    items: result.items,
    total: result.total,
    sumPhp: result.sumPhp ?? null,
    page,
    limit,
    pages: Math.max(1, Math.ceil(result.total / limit)),
  };
}

/** Spreadsheet apps run cells that start with these characters as formulas. */
function csvCell(value) {
  if (value == null) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function exportFinanceRecordsService(kind, query = {}) {
  const { spec, filters } = parseListQuery(kind, { ...query, page: undefined, limit: undefined });
  const result = await spec.load({ ...filters, limit: CSV_ROW_LIMIT, offset: 0 });
  const lines = [spec.columns.map(([label]) => csvCell(label)).join(',')];
  for (const row of result.items) {
    lines.push(spec.columns.map(([, get]) => csvCell(get(row))).join(','));
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    filename: `ensemble-${spec.filename}-${stamp}.csv`,
    csv: `﻿${lines.join('\r\n')}\r\n`,
    rows: result.items.length,
    total: result.total,
    truncated: result.total > result.items.length,
  };
}

async function getFinanceFilterOptionsService() {
  return repo.listFinanceFilterOptions();
}

module.exports = {
  AnalyticsServiceError,
  CSV_ROW_LIMIT,
  resolveRange,
  getAdminAnalyticsOverviewService,
  listFinanceRecordsService,
  exportFinanceRecordsService,
  getFinanceFilterOptionsService,
};
