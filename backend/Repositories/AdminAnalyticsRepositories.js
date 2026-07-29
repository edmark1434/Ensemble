const { pool } = require('../lib/database');
const { getMongoClient, connectMongoDB } = require('../lib/mongodb');

function normalizeStatus(status) {
  if (!status) return 'Pending';
  const s = String(status).toLowerCase();
  if (s === 'active') return 'Active';
  if (s.includes('suspend')) return 'Suspended';
  if (s.includes('ban')) return 'Banned';
  return status;
}

function deriveVerification(row) {
  const v = String(row.verification_status || '').toLowerCase();
  if (v === 'verified' || v === 'approved' || v === 'business verified') return 'Fully verified';
  if (v.includes('reverification') || v === 'expired') return 'Pending review';
  if (v.includes('pending') || v.includes('review')) return 'Pending review';
  if (v.includes('partial')) return 'Partially verified';
  if (row.firebase_user_uuid && row.customer_id) return 'Partially verified';
  return 'Unverified';
}

async function fetchPlatformMembers() {
  const result = await pool.query(`
    SELECT
      u.user_id,
      u.first_name,
      u.last_name,
      u.email_address,
      u.firebase_user_uuid,
      u.customer_id,
      a.handle,
      a.display_name,
      a.status,
      a.merit_score,
      a.avatar_file_id,
      a.tagline,
      a.created_at,
      av.status AS verification_status,
      COALESCE(w.balance_credits, 0)::int AS balance_credits
    FROM users u
    INNER JOIN accounts a ON a.account_id = u.account_id
    LEFT JOIN LATERAL (
      SELECT status
      FROM account_verification av
      WHERE av.account_id = a.account_id AND av.deleted_at IS NULL
      ORDER BY av.created_at DESC
      LIMIT 1
    ) av ON TRUE
    LEFT JOIN LATERAL (
      SELECT w.balance_credits
      FROM account_wallets aw
      INNER JOIN wallets w ON w.wallet_id = aw.wallet_id
      WHERE aw.account_id = a.account_id
        AND w.type = 'account wallets'
      ORDER BY w.created_at DESC
      LIMIT 1
    ) w ON TRUE
    WHERE a.deleted_at IS NULL
    ORDER BY a.created_at DESC
  `);
  return result.rows.map((r) => {
    const name =
      [r.first_name, r.last_name].filter(Boolean).join(' ').trim() ||
      r.display_name ||
      r.handle;
    return {
      id: r.user_id,
      name,
      username: r.handle,
      email: r.email_address,
      status: normalizeStatus(r.status),
      verification: deriveVerification(r),
      merit: r.merit_score ?? 0,
      credits: Number(r.balance_credits || 0),
      hasAvatar: Boolean(r.avatar_file_id),
      hasTagline: Boolean(r.tagline),
      joinedAt: r.created_at,
    };
  });
}

async function fetchStaffSummary() {
  const result = await pool.query(`
    SELECT s.role, COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE LOWER(COALESCE(a.status, '')) = 'active')::int AS active
    FROM staff s
    INNER JOIN accounts a ON a.account_id = s.account_id
    GROUP BY s.role
    ORDER BY count DESC
  `);
  return result.rows.map((r) => ({
    role: r.role,
    count: r.count,
    active: r.active,
  }));
}

async function fetchSignupTrend() {
  const result = await pool.query(`
    WITH bounds AS (
      SELECT DATE_TRUNC('week', CURRENT_TIMESTAMP) AS current_week
    ),
    week_spine AS (
      SELECT gs AS week_start
      FROM bounds,
        generate_series(
          bounds.current_week - INTERVAL '11 weeks',
          bounds.current_week,
          INTERVAL '1 week'
        ) AS gs
    ),
    counted AS (
      SELECT
        DATE_TRUNC('week', created_at) AS week_start,
        COUNT(*)::int AS signups
      FROM accounts
      WHERE deleted_at IS NULL AND type = 'User'
      GROUP BY DATE_TRUNC('week', created_at)
    ),
    filled AS (
      SELECT
        w.week_start,
        COALESCE(c.signups, 0)::int AS signups
      FROM week_spine w
      LEFT JOIN counted c ON c.week_start = w.week_start
    )
    SELECT
      TO_CHAR(f.week_start, 'Mon DD') AS week_label,
      f.week_start,
      f.signups,
      (
        SELECT COALESCE(SUM(x.signups), 0)::int
        FROM counted x
        WHERE x.week_start <= f.week_start
      ) AS cumulative
    FROM filled f
    ORDER BY f.week_start ASC
  `);
  return result.rows.map((r) => ({
    week: r.week_label,
    weekStart: r.week_start,
    newMembers: Number(r.signups || 0),
    cumulativeMembers: Number(r.cumulative || 0),
  }));
}

async function fetchSignupByMonth() {
  const result = await pool.query(`
    WITH bounds AS (
      SELECT DATE_TRUNC('month', CURRENT_TIMESTAMP) AS current_month
    ),
    month_spine AS (
      SELECT gs AS month_start
      FROM bounds,
        generate_series(
          bounds.current_month - INTERVAL '11 months',
          bounds.current_month,
          INTERVAL '1 month'
        ) AS gs
    ),
    counted AS (
      SELECT
        DATE_TRUNC('month', created_at) AS month_start,
        COUNT(*)::int AS signups
      FROM accounts
      WHERE deleted_at IS NULL AND type = 'User'
      GROUP BY DATE_TRUNC('month', created_at)
    )
    SELECT
      TO_CHAR(m.month_start, 'Mon YYYY') AS month_label,
      m.month_start,
      COALESCE(c.signups, 0)::int AS signups
    FROM month_spine m
    LEFT JOIN counted c ON c.month_start = m.month_start
    ORDER BY m.month_start ASC
  `);
  return result.rows.map((r) => ({
    label: r.month_label,
    monthStart: r.month_start,
    value: Number(r.signups || 0),
  }));
}

async function fetchActivityTrend() {
  const result = await pool
    .query(
      `
    WITH bounds AS (
      SELECT DATE_TRUNC('week', CURRENT_TIMESTAMP) AS current_week
    ),
    week_spine AS (
      SELECT gs AS week_start
      FROM bounds,
        generate_series(
          bounds.current_week - INTERVAL '11 weeks',
          bounds.current_week,
          INTERVAL '1 week'
        ) AS gs
    )
    SELECT
      TO_CHAR(w.week_start, 'Mon DD') AS week_label,
      w.week_start,
      (
        SELECT COUNT(*)::int FROM accounts a
        WHERE a.deleted_at IS NULL AND a.type = 'User'
          AND DATE_TRUNC('week', a.created_at) = w.week_start
      ) AS signups,
      (
        SELECT COUNT(*)::int FROM tickets t
        WHERE DATE_TRUNC('week', t.created_at) = w.week_start
      ) AS tickets,
      (
        SELECT COUNT(*)::int FROM reports r
        WHERE r.deleted_at IS NULL
          AND DATE_TRUNC('week', r.created_at) = w.week_start
      ) AS reports,
      (
        SELECT COUNT(*)::int FROM credit_transactions ct
        WHERE DATE_TRUNC('week', ct.created_at) = w.week_start
      ) AS credit_tx,
      (
        SELECT COUNT(*)::int FROM marketplace_listings ml
        WHERE DATE_TRUNC('week', ml.created_at) = w.week_start
      ) AS listings
    FROM week_spine w
    ORDER BY w.week_start ASC
  `
    )
    .catch((err) => {
      console.error('fetchActivityTrend error:', err.message);
      return { rows: [] };
    });

  return result.rows.map((r) => ({
    label: r.week_label,
    weekStart: r.week_start,
    signups: Number(r.signups || 0),
    tickets: Number(r.tickets || 0),
    reports: Number(r.reports || 0),
    creditTransactions: Number(r.credit_tx || 0),
    listings: Number(r.listings || 0),
  }));
}

function buildCreditBuckets(members) {
  const buckets = [
    { label: '0–10k', min: 0, max: 10000 },
    { label: '10k–50k', min: 10001, max: 50000 },
    { label: '50k–100k', min: 50001, max: 100000 },
    { label: '100k+', min: 100001, max: Infinity },
  ];
  return buckets.map((b) => ({
    label: b.label,
    count: members.filter((m) => m.credits >= b.min && m.credits <= b.max).length,
  }));
}

function buildEngagementTrend(signupTrend, totalMembers) {
  return signupTrend.map((w) => ({
    label: w.week,
    weekStart: w.weekStart,
    signups: w.newMembers,
    estimatedDau: Math.max(0, Math.round((w.cumulativeMembers || totalMembers) * 0.11)),
    estimatedWau: Math.max(0, Math.round((w.cumulativeMembers || totalMembers) * 0.27)),
    estimatedMau: Math.max(0, Math.round((w.cumulativeMembers || totalMembers) * 0.62)),
  }));
}

function buildGroupSizeDistribution(groups) {
  const buckets = [
    { label: '1–2', min: 1, max: 2 },
    { label: '3–5', min: 3, max: 5 },
    { label: '6–10', min: 6, max: 10 },
    { label: '11+', min: 11, max: Infinity },
  ];
  return buckets.map((b) => ({
    label: b.label,
    count: groups.filter((g) => g.members >= b.min && g.members <= b.max).length,
  }));
}

async function fetchForumPlatformStats() {
  let client = getMongoClient();
  if (!client) client = await connectMongoDB();
  if (!client) {
    return { available: false };
  }

  try {
    const db = client.db('ensemble');
    const groupsCol = db.collection('forum_groups');
    const discussionsCol = db.collection('forum_discussions');

    const [groups, discussions, totalGroups, activeCount, inactiveCount, totalDiscussions] =
      await Promise.all([
        groupsCol.find({}).sort({ created_at: -1 }).limit(30).toArray(),
        discussionsCol.find({}).sort({ created_at: -1 }).limit(20).toArray(),
        groupsCol.countDocuments({}),
        groupsCol.countDocuments({ status: 'active' }),
        groupsCol.countDocuments({ status: { $ne: 'active' } }),
        discussionsCol.countDocuments({}),
      ]);

    const memberTotal = groups.reduce((s, g) => s + (g.members?.length || 0), 0);
    const tagMap = new Map();
    for (const g of groups) {
      for (const tag of g.tags || []) tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    }

    const commentTotal = discussions.reduce((s, d) => s + (d.comments?.length || 0), 0);

    return {
      available: true,
      groups: {
        total: totalGroups,
        active: activeCount,
        inactive: inactiveCount,
        totalMembers: memberTotal,
        avgMembersPerGroup: groups.length
          ? Math.round((memberTotal / groups.length) * 10) / 10
          : 0,
      },
      discussions: {
        total: totalDiscussions,
        sampledComments: commentTotal,
        avgComments: discussions.length
          ? Math.round((commentTotal / discussions.length) * 10) / 10
          : 0,
      },
      allGroupsMemberCounts: groups.map((g) => ({
        members: g.members?.length || 0,
      })),
      topGroups: groups
        .map((g) => ({
          id: String(g._id),
          name: g.group_name || 'Unnamed group',
          members: g.members?.length || 0,
          status: g.status || 'unknown',
        }))
        .sort((a, b) => b.members - a.members)
        .slice(0, 8),
      popularTags: Array.from(tagMap.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      recentDiscussions: discussions.slice(0, 8).map((d) => ({
        id: String(d._id),
        title: d.title || d.discussion_title || 'Discussion',
        comments: d.comments?.length || 0,
        authorId: d.user_id,
      })),
    };
  } catch {
    return { available: false };
  }
}

function buildMeritTiers(members) {
  const tiers = [
    { tier: 'Newcomer', range: '0–25', min: 0, max: 25 },
    { tier: 'Contributor', range: '26–50', min: 26, max: 50 },
    { tier: 'Established', range: '51–75', min: 51, max: 75 },
    { tier: 'Veteran', range: '76–100', min: 76, max: 100 },
    { tier: 'Elite', range: '100+', min: 101, max: Infinity },
  ];
  return tiers.map((t) => ({
    tier: t.tier,
    range: t.range,
    count: members.filter((m) => m.merit >= t.min && m.merit <= t.max).length,
  }));
}

function buildPlatformAlerts(members, forum, pendingCount, suspendedCount, liveModules = {}) {
  const alerts = [];
  const unverified = members.filter((m) => m.verification === 'Unverified').length;

  if (pendingCount > 0) {
    alerts.push({
      id: 'pending',
      message: `${pendingCount} member(s) awaiting verification or approval.`,
      severity: 'warning',
    });
  }
  if (suspendedCount > 0) {
    alerts.push({
      id: 'suspended',
      message: `${suspendedCount} suspended member account(s) on the platform.`,
      severity: 'warning',
    });
  }
  if ((liveModules.openTickets || 0) > 0) {
    alerts.push({
      id: 'tickets',
      message: `${liveModules.openTickets} open support ticket(s) need attention.`,
      severity: 'warning',
    });
  }
  if ((liveModules.openReports || 0) + (liveModules.openDisputes || 0) > 0) {
    alerts.push({
      id: 'moderation',
      message: `${liveModules.openReports || 0} open report(s) and ${liveModules.openDisputes || 0} open dispute(s).`,
      severity: 'warning',
    });
  }
  if (unverified > members.length * 0.3 && members.length > 0) {
    alerts.push({
      id: 'identity',
      message: `${unverified} members have incomplete identity verification.`,
      severity: 'info',
    });
  }
  if (!forum.available) {
    alerts.push({
      id: 'forum-off',
      message: 'Community forum data is offline — community metrics may be incomplete.',
      severity: 'info',
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: 'healthy',
      message: 'Platform metrics look stable from the latest scan.',
      severity: 'success',
    });
  }
  return alerts.slice(0, 5);
}

function computeEngagementScore(members, forum, profileRate) {
  let score = 0;
  if (members.length > 0) score += 25;
  score += Math.min(25, Math.round(profileRate * 0.25));
  if (forum.available) {
    if (forum.groups.total > 0) score += 20;
    if (forum.discussions.total > 0) score += 20;
    score += Math.min(10, forum.discussions.avgComments * 2);
  }
  const activeRate = members.length
    ? members.filter((m) => m.status === 'Active').length / members.length
    : 0;
  score += Math.round(activeRate * 20);
  return Math.min(100, score);
}

async function getAnalyticsOverview() {
  const [
    members,
    staffRoles,
    signupTrend,
    accountCounts,
    forum,
    liveModules,
    creditTotals,
    pendingVerify,
    activityTrend,
  ] = await Promise.all([
      fetchPlatformMembers(),
      fetchStaffSummary(),
      fetchSignupTrend(),
      pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE type = 'User' AND deleted_at IS NULL)::int AS users,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'active' AND type = 'User' AND deleted_at IS NULL)::int AS active_users,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) != 'active' AND type = 'User' AND deleted_at IS NULL)::int AS non_active_users,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) LIKE '%suspend%' AND type = 'User' AND deleted_at IS NULL)::int AS suspended_users,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) LIKE '%ban%' AND type = 'User' AND deleted_at IS NULL)::int AS banned_users
      FROM accounts
    `),
      fetchForumPlatformStats(),
      fetchLiveModuleCounts(),
      pool
        .query(
          `
        SELECT COALESCE(SUM(w.balance_credits), 0)::bigint AS credits
        FROM wallets w
        WHERE w.type = 'account wallets'
      `
        )
        .catch(() => ({ rows: [{ credits: 0 }] })),
      pool
        .query(
          `
        SELECT COUNT(*)::int AS c
        FROM (
          SELECT DISTINCT ON (account_id) status
          FROM account_verification
          WHERE deleted_at IS NULL
          ORDER BY account_id, created_at DESC
        ) latest
        WHERE LOWER(COALESCE(status, 'unverified')) IN (
          'pending', 'pending review', 'reverification_required'
        )
      `
        )
        .catch(() => ({ rows: [{ c: 0 }] })),
      fetchActivityTrend(),
    ]);

  const counts = accountCounts.rows[0];
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === 'Active').length;
  const verifiedMembers = members.filter((m) => m.verification === 'Fully verified').length;
  const pendingMembers = Number(pendingVerify.rows[0]?.c || 0);
  const pendingFromDirectory = members.filter((m) => m.verification === 'Pending review').length;
  const pendingVerifications = Math.max(pendingMembers, pendingFromDirectory);
  const suspendedMembers = Number(counts.suspended_users);
  const bannedMembers = Number(counts.banned_users || 0);

  const withAvatar = members.filter((m) => m.hasAvatar).length;
  const withTagline = members.filter((m) => m.hasTagline).length;
  const profileCompleteRate = totalMembers
    ? Math.round(((withAvatar + withTagline) / (totalMembers * 2)) * 100)
    : 0;

  const totalMerit = members.reduce((s, m) => s + m.merit, 0);
  const memberCredits = members.reduce((s, m) => s + m.credits, 0);
  const totalCredits = Math.max(Number(creditTotals.rows[0]?.credits || 0), memberCredits);

  const lastWeek = signupTrend.length ? signupTrend[signupTrend.length - 1].newMembers : 0;
  const prevWeek = signupTrend.length > 1 ? signupTrend[signupTrend.length - 2].newMembers : lastWeek;
  const growthPercent =
    prevWeek > 0 ? Math.round(((lastWeek - prevWeek) / prevWeek) * 100) : lastWeek > 0 ? 100 : 0;

  const engagementScore = computeEngagementScore(members, forum, profileCompleteRate);

  const estimatedMau = Math.max(0, Math.round(totalMembers * 0.62));
  const estimatedWau = Math.max(0, Math.round(totalMembers * 0.27));
  const estimatedDau = Math.max(0, Math.round(totalMembers * 0.11));

  const participationRate =
    forum.available && totalMembers > 0
      ? Math.min(100, Math.round((forum.groups.totalMembers / totalMembers) * 100))
      : null;

  const signupsByMonth = await fetchSignupByMonth();
  const engagementTrend = buildEngagementTrend(signupTrend, totalMembers);
  const creditBuckets = buildCreditBuckets(members);
  const groupSizeDistribution = forum.available
    ? buildGroupSizeDistribution(forum.allGroupsMemberCounts || [])
    : [];

  const platformActivity = [
    { label: 'Tickets', value: liveModules.tickets, color: '#60a5fa' },
    { label: 'Open tickets', value: liveModules.openTickets, color: '#fb7185' },
    { label: 'Reports', value: liveModules.reports, color: '#fbbf24' },
    { label: 'Disputes', value: liveModules.disputes, color: '#a78bfa' },
    { label: 'Listings', value: liveModules.marketplaceListings, color: '#34d399' },
    { label: 'Credit tx', value: liveModules.creditTransactions, color: '#f472b6' },
    { label: 'Teams', value: liveModules.teams, color: '#38bdf8' },
    { label: 'Violations', value: liveModules.violations, color: '#f87171' },
  ].filter((x) => x.value > 0);

  const listingStatusMix = [
    { label: 'Pending', value: liveModules.pendingListings, color: '#fbbf24' },
    { label: 'Approved', value: liveModules.approvedListings, color: '#34d399' },
    {
      label: 'Other',
      value: Math.max(
        0,
        liveModules.marketplaceListings - liveModules.pendingListings - liveModules.approvedListings
      ),
      color: '#71717a',
    },
  ].filter((x) => x.value > 0);

  const verificationChart = [
    { label: 'Fully verified', value: members.filter((m) => m.verification === 'Fully verified').length, color: '#34d399' },
    { label: 'Partial', value: members.filter((m) => m.verification === 'Partially verified').length, color: '#fbbf24' },
    { label: 'Unverified', value: members.filter((m) => m.verification === 'Unverified').length, color: '#71717a' },
    { label: 'Pending', value: members.filter((m) => m.verification === 'Pending review').length, color: '#f87171' },
  ].filter((x) => x.value > 0);

  const statusChart = [
    { label: 'Active', value: activeMembers, color: '#34d399' },
    { label: 'Suspended', value: suspendedMembers, color: '#fbbf24' },
    { label: 'Banned', value: bannedMembers, color: '#f87171' },
    { label: 'Other', value: Math.max(0, totalMembers - activeMembers - suspendedMembers - bannedMembers), color: '#a1a1aa' },
  ].filter((x) => x.value > 0);

  return {
    lastUpdated: new Date().toISOString(),
    kpis: {
      totalMembers,
      activeMembers,
      newMembersThisWeek: lastWeek,
      memberGrowthPercent: growthPercent,
      verifiedMembersPercent: totalMembers ? Math.round((verifiedMembers / totalMembers) * 100) : 0,
      profileCompletePercent: profileCompleteRate,
      engagementScore,
      estimatedDau,
      estimatedWau,
      estimatedMau,
      forumGroups: forum.available ? forum.groups.total : null,
      forumDiscussions: forum.available ? forum.discussions.total : null,
      totalCreditsInCirculation: totalCredits,
      avgMemberMerit: totalMembers ? Math.round((totalMerit / totalMembers) * 10) / 10 : 0,
      moderationTeamSize: staffRoles.reduce((s, r) => s + r.count, 0),
      pendingVerifications,
      openTickets: liveModules.openTickets,
      openReports: liveModules.openReports,
      openDisputes: liveModules.openDisputes,
      teams: liveModules.teams,
      marketplaceListings: liveModules.marketplaceListings,
    },
    alerts: buildPlatformAlerts(members, forum, pendingVerifications, suspendedMembers, liveModules),
    growth: {
      signupsByWeek: signupTrend,
      signupsByMonth,
      engagementTrend,
      activityTrend,
      weekOverWeekChange: growthPercent,
      trendLabel:
        growthPercent > 10 ? 'Growing' : growthPercent < -5 ? 'Declining' : 'Stable',
      newestMembers: members.slice(0, 8).map((m) => ({
        id: m.id,
        name: m.name,
        username: m.username,
        joinedAt: m.joinedAt,
        status: m.status,
        verification: m.verification,
        merit: m.merit,
      })),
      retentionEstimate: Math.min(95, 60 + Math.round(activeMembers / Math.max(totalMembers, 1) * 35)),
      avgSignupsPerWeek:
        signupTrend.length > 0
          ? Math.round(signupTrend.reduce((s, w) => s + w.newMembers, 0) / signupTrend.length)
          : 0,
    },
    charts: {
      verificationMix: verificationChart,
      statusMix: statusChart,
      meritTierBars: buildMeritTiers(members).map((t) => ({ label: t.tier, value: t.count })),
      creditBuckets,
      groupSizeDistribution,
      platformActivity,
      listingStatusMix,
    },
    memberDirectory: members.map((m) => ({
      id: m.id,
      name: m.name,
      username: m.username,
      status: m.status,
      verification: m.verification,
      merit: m.merit,
      credits: m.credits,
      joinedAt: m.joinedAt,
      hasAvatar: m.hasAvatar,
      hasTagline: m.hasTagline,
    })),
    audience: {
      totalMembers,
      activeMembers,
      byStatus: ['Active', 'Suspended', 'Banned', 'Pending'].map((label) => ({
        label,
        count: members.filter((m) => m.status === label || (label === 'Pending' && m.status === 'Pending')).length,
      })).filter((x) => x.count > 0 || x.label === 'Active'),
      byVerification: {
        fullyVerified: members.filter((m) => m.verification === 'Fully verified').length,
        partiallyVerified: members.filter((m) => m.verification === 'Partially verified').length,
        unverified: members.filter((m) => m.verification === 'Unverified').length,
        pendingReview: members.filter((m) => m.verification === 'Pending review').length,
      },
      meritTiers: buildMeritTiers(members),
      topMembers: [...members]
        .sort((a, b) => b.merit - a.merit)
        .slice(0, 10)
        .map((m, i) => ({
          rank: i + 1,
          name: m.name,
          username: m.username,
          merit: m.merit,
          credits: m.credits,
          status: m.status,
        })),
      profileHealth: {
        withAvatar: withAvatar,
        withTagline: withTagline,
        avatarRate: totalMembers ? Math.round((withAvatar / totalMembers) * 100) : 0,
        taglineRate: totalMembers ? Math.round((withTagline / totalMembers) * 100) : 0,
        completeProfiles: members.filter((m) => m.hasAvatar && m.hasTagline).length,
      },
      emailDomains: await pool
        .query(`
          SELECT LOWER(SPLIT_PART(email_address, '@', 2)) AS domain, COUNT(*)::int AS count
          FROM users GROUP BY domain ORDER BY count DESC LIMIT 6
        `)
        .then((r) => r.rows.map((d) => ({ domain: d.domain, count: d.count }))),
    },
    community: forum.available
      ? {
          available: true,
          summary: forum.groups,
          discussions: forum.discussions,
          participationRate,
          topGroups: forum.topGroups,
          popularTags: forum.popularTags,
          recentDiscussions: forum.recentDiscussions,
        }
      : {
          available: false,
          summary: null,
          message: 'Forum community metrics unavailable right now.',
        },
    economy: {
      totalMerit,
      totalCreditsInCirculation: totalCredits,
      avgCreditsPerMember: totalMembers ? Math.round(totalCredits / totalMembers) : 0,
      avgMeritPerMember: totalMembers ? Math.round((totalMerit / totalMembers) * 10) / 10 : 0,
      meritLeaders: [...members]
        .sort((a, b) => b.merit - a.merit)
        .slice(0, 6)
        .map((m) => ({ name: m.name, username: m.username, merit: m.merit, credits: m.credits })),
      distribution: buildMeritTiers(members),
      creditBuckets,
      creditTransactions: liveModules.creditTransactions,
    },
    operations: {
      moderationTeam: staffRoles,
      activeModerators: staffRoles.reduce((s, r) => s + r.active, 0),
      pendingVerifications,
      suspendedAccounts: suspendedMembers,
      bannedAccounts: bannedMembers,
      nonActiveAccounts: Number(counts.non_active_users),
      platformHealthScore: engagementScore,
      openTickets: liveModules.openTickets,
      openReports: liveModules.openReports,
      openDisputes: liveModules.openDisputes,
      activeViolations: liveModules.activeViolations,
      pendingListings: liveModules.pendingListings,
    },
    insights: buildInsights(members, forum, growthPercent, engagementScore, liveModules),
    liveModules,
    comingSoon: {
      title: 'Metrics still estimated or awaiting session instrumentation',
      modules: [
        { name: 'Session analytics', metrics: 'DAU/WAU currently estimated from member base' },
      ],
    },
  };
}

async function fetchLiveModuleCounts() {
  const [teams, listings, jobs, projects, tx, reports, disputes, tickets, violations] =
    await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS c FROM teams`).catch(() => ({ rows: [{ c: 0 }] })),
      pool
        .query(
          `
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(status) = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE LOWER(status) = 'approved')::int AS approved
      FROM marketplace_listings
    `
        )
        .catch(() => ({ rows: [{ total: 0, pending: 0, approved: 0 }] })),
      pool.query(`SELECT COUNT(*)::int AS c FROM jobs`).catch(() => ({ rows: [{ c: 0 }] })),
      pool.query(`SELECT COUNT(*)::int AS c FROM projects`).catch(() => ({ rows: [{ c: 0 }] })),
      pool
        .query(`SELECT COUNT(*)::int AS c FROM credit_transactions`)
        .catch(() => ({ rows: [{ c: 0 }] })),
      pool
        .query(
          `
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE deleted_at IS NULL
              AND LOWER(COALESCE(status, 'open')) NOT IN ('resolved', 'closed', 'dismissed')
          )::int AS open_count
        FROM reports
      `
        )
        .catch(() => ({ rows: [{ total: 0, open_count: 0 }] })),
      pool
        .query(
          `
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(status, 'open')) NOT IN ('resolved', 'closed')
          )::int AS open_count
        FROM disputes
      `
        )
        .catch(() => ({ rows: [{ total: 0, open_count: 0 }] })),
      pool
        .query(
          `
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE deleted_at IS NULL
              AND LOWER(COALESCE(status, 'open')) NOT IN ('resolved', 'closed')
          )::int AS open_count
        FROM tickets
      `
        )
        .catch(() => ({ rows: [{ total: 0, open_count: 0 }] })),
      pool
        .query(
          `
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE deleted_at IS NULL
              AND LOWER(COALESCE(status, 'active')) IN ('active', 'open')
          )::int AS active_count
        FROM violations
      `
        )
        .catch(() => ({ rows: [{ total: 0, active_count: 0 }] })),
    ]);

  return {
    teams: Number(teams.rows[0].c),
    marketplaceListings: Number(listings.rows[0].total),
    pendingListings: Number(listings.rows[0].pending),
    approvedListings: Number(listings.rows[0].approved),
    jobs: Number(jobs.rows[0].c),
    projects: Number(projects.rows[0].c),
    creditTransactions: Number(tx.rows[0].c),
    reports: Number(reports.rows[0].total),
    openReports: Number(reports.rows[0].open_count),
    disputes: Number(disputes.rows[0].total),
    openDisputes: Number(disputes.rows[0].open_count),
    tickets: Number(tickets.rows[0].total),
    openTickets: Number(tickets.rows[0].open_count),
    violations: Number(violations.rows[0].total),
    activeViolations: Number(violations.rows[0].active_count),
  };
}

function buildInsights(members, forum, growth, engagement, liveModules = {}) {
  const insights = [];

  if (growth > 15) {
    insights.push({
      id: 'growth',
      title: 'Strong signup momentum',
      detail: `Member growth is up ${growth}% week over week. Consider onboarding campaigns.`,
      type: 'positive',
    });
  } else if (growth < 0) {
    insights.push({
      id: 'growth-down',
      title: 'Signup slowdown',
      detail: 'New member signups declined versus last week. Review acquisition channels.',
      type: 'warning',
    });
  }

  const unverified = members.filter((m) => m.verification === 'Unverified').length;
  if (unverified > 0) {
    insights.push({
      id: 'verify',
      title: 'Verification opportunity',
      detail: `${unverified} members could be nudged to complete identity and payment setup.`,
      type: 'info',
    });
  }

  if (forum.available && forum.discussions.total > 0) {
    insights.push({
      id: 'forum',
      title: 'Community activity',
      detail: `${forum.discussions.total} discussions across ${forum.groups.total} groups — monitor engagement quality.`,
      type: 'info',
    });
  }

  if ((liveModules.openTickets || 0) > 5) {
    insights.push({
      id: 'tickets',
      title: 'Support backlog',
      detail: `${liveModules.openTickets} open tickets and ${liveModules.openDisputes || 0} open disputes are in the queue.`,
      type: 'warning',
    });
  }

  if ((liveModules.pendingListings || 0) > 0) {
    insights.push({
      id: 'listings',
      title: 'Marketplace review queue',
      detail: `${liveModules.pendingListings} marketplace listing(s) awaiting approval.`,
      type: 'info',
    });
  }

  if (engagement >= 70) {
    insights.push({
      id: 'engage',
      title: 'Healthy engagement',
      detail: `Platform engagement score is ${engagement}/100 based on members, profiles, and community data.`,
      type: 'positive',
    });
  }

  return insights.slice(0, 6);
}

module.exports = { getAnalyticsOverview };
