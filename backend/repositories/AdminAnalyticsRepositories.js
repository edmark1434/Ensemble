const { pool } = require('../lib/Database');
const { getMongoClient, connectMongoDB } = require('../lib/MongoDb');

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
      CASE
        WHEN COALESCE(v.is_verified, FALSE) THEN 'verified'
        WHEN avs.verification_status IS NOT NULL THEN avs.verification_status
        ELSE 'unverified'
      END AS verification_status,
      COALESCE(w.balance_credits, 0)::int AS balance_credits
    FROM users u
    INNER JOIN accounts a ON a.account_id = u.account_id
    LEFT JOIN verifications v ON v.account_id = a.account_id
    LEFT JOIN verification_sessions avs ON avs.verification_session_id = v.verification_session_id
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
    platformEconomy,
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
        FROM verifications v
        LEFT JOIN verification_sessions avs ON avs.verification_session_id = v.verification_session_id
        WHERE COALESCE(v.is_verified, FALSE) = FALSE
          AND LOWER(COALESCE(avs.verification_status, 'unverified')) IN (
            'pending', 'pending review', 'reverification_required'
          )
      `
        )
        .catch(() => ({ rows: [{ c: 0 }] })),
      fetchActivityTrend(),
      fetchPlatformEconomyDetails(),
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
      ticketRatings: liveModules.ticketRatings || 0,
      ticketSatisfaction: liveModules.ticketSatisfaction ?? null,
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
      platformRevenue: platformEconomy.platformRevenue,
      platformPayout: platformEconomy.platformPayout,
      platformTransactions: platformEconomy.platformTransactions,
      userTransactions: platformEconomy.userTransactions,
      subscriptionAnalytics: platformEconomy.subscriptionAnalytics,
      topupAnalytics: platformEconomy.topupAnalytics,
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
      ticketRatings: liveModules.ticketRatings || 0,
      ticketSatisfaction: liveModules.ticketSatisfaction ?? null,
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
              AND LOWER(COALESCE(status, 'open')) NOT IN ('resolved', 'closed', 'dismissed', 'denied', 'archived', 'sanctioned')
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
          )::int AS open_count,
          COUNT(*) FILTER (WHERE satisfaction_score IS NOT NULL)::int AS rated_count,
          ROUND(AVG(satisfaction_score)::numeric, 2) AS avg_satisfaction
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
              AND (expires_at IS NULL OR expires_at > NOW())
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
    ticketRatings: Number(tickets.rows[0].rated_count || 0),
    ticketSatisfaction: tickets.rows[0].avg_satisfaction == null ? null : Number(tickets.rows[0].avg_satisfaction),
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

async function fetchPlatformEconomyDetails() {
  const pwRes = await pool.query(`
    SELECT wallet_id, balance_credits, frozen_balance_credits, status
    FROM wallets
    WHERE type = 'platform wallets'
    LIMIT 1
  `);
  const platformWallet = pwRes.rows[0] || null;
  const platformWalletId = platformWallet?.wallet_id || null;

  const [
    feesRes,
    cashoutStatsRes,
    paymentsStatsRes,
    platformTxRes,
    userTxRes,
    recentCashoutsRes,
    plansRes,
    subsStatsRes,
    invoicesRes,
    userSubsRes,
    topupStatsRes,
    topupTxRes,
  ] = await Promise.all([
    pool.query(`
      SELECT
        type,
        status,
        COUNT(*)::int AS count,
        COALESCE(SUM(amount_credits), 0)::bigint AS total_credits
      FROM credit_transactions
      WHERE destination_wallet_id = $1
         OR type IN ('Fee', 'Job Posting Fee', 'Proposal Fee')
      GROUP BY type, status
    `, [platformWalletId]).catch(() => ({ rows: [] })),

    pool.query(`
      SELECT
        status,
        COUNT(*)::int AS count,
        COALESCE(SUM(amount_credits), 0)::bigint AS total_credits,
        COALESCE(SUM(fee_php_cents), 0)::bigint AS total_fee_cents,
        COALESCE(SUM(net_amount_php_cents), 0)::bigint AS total_net_cents
      FROM cashouts
      GROUP BY status
    `).catch(() => ({ rows: [] })),

    pool.query(`
      SELECT
        payment_type,
        status,
        COUNT(*)::int AS count,
        COALESCE(SUM(amount), 0)::numeric(12,2) AS total_amount,
        COALESCE(SUM(credits), 0)::bigint AS total_credits
      FROM payments
      GROUP BY payment_type, status
    `).catch(() => ({ rows: [] })),

    pool.query(`
      SELECT
        ct.credit_transaction_id AS id,
        CASE
          WHEN ct.type IN ('Fee', 'Job Posting Fee', 'Proposal Fee') THEN ct.type
          WHEN ct.reference_table = 'payments' OR p.payment_type = 'TOPUP' THEN 'Top-up Grant'
          ELSE ct.type
        END AS type,
        ct.amount_credits AS "amountCredits",
        ct.status,
        ct.created_at AS "createdAt",
        ct.reference_table AS "referenceTable",
        ct.reference_id AS "referenceId",
        p.amount::numeric(10,2) AS "fiatAmountPhp",
        p.channel_code AS "fiatChannelCode",
        CASE
          WHEN ct.type IN ('Fee', 'Job Posting Fee', 'Proposal Fee') THEN 'inflow'
          WHEN ct.reference_table = 'payments' OR p.payment_type = 'TOPUP' THEN 'inflow'
          WHEN ct.destination_wallet_id = $1 THEN 'inflow'
          WHEN ct.source_wallet_id = $1 THEN 'outflow'
          ELSE 'inflow'
        END AS direction,
        CASE
          WHEN ct.type IN ('Fee', 'Job Posting Fee', 'Proposal Fee') THEN ct.amount_credits
          WHEN ct.destination_wallet_id = $1 THEN ct.amount_credits
          ELSE 0
        END AS "revenueCredits",
        CASE
          WHEN ct.destination_wallet_id = $1 THEN
            COALESCE(sa.display_name, sa.handle, 'System')
          ELSE
            COALESCE(da.display_name, da.handle, 'System')
        END AS "counterpartyName",
        CASE
          WHEN ct.destination_wallet_id = $1 THEN sa.handle
          ELSE da.handle
        END AS "counterpartyHandle",
        CASE
          WHEN ct.destination_wallet_id = $1 THEN COALESCE(sa.type, 'User')
          ELSE COALESCE(da.type, 'User')
        END AS "counterpartyType"
      FROM credit_transactions ct
      LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
      LEFT JOIN account_wallets saw ON saw.wallet_id = sw.wallet_id
      LEFT JOIN accounts sa ON sa.account_id = saw.account_id
      LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
      LEFT JOIN account_wallets daw ON daw.wallet_id = dw.wallet_id
      LEFT JOIN accounts da ON da.account_id = daw.account_id
      LEFT JOIN payments p ON (ct.reference_table = 'payments' AND ct.reference_id = p.id)
      WHERE ct.source_wallet_id = $1
         OR ct.destination_wallet_id = $1
         OR ct.type IN ('Fee', 'Job Posting Fee', 'Proposal Fee')
      ORDER BY ct.created_at DESC
      LIMIT 100
    `, [platformWalletId]).catch(() => ({ rows: [] })),

    pool.query(`
      SELECT
        ct.credit_transaction_id AS id,
        ct.type,
        ct.amount_credits AS "amountCredits",
        ct.status,
        ct.created_at AS "createdAt",
        ct.reference_table AS "referenceTable",
        ct.reference_id AS "referenceId",
        ct.fee_transaction_id AS "feeTransactionId",
        sw.type AS "sourceWalletType",
        dw.type AS "destWalletType",
        COALESCE(sa.display_name, sa.handle, CASE WHEN sw.type = 'platform wallets' THEN 'Platform Wallet' ELSE 'Unknown' END) AS "sourceName",
        sa.handle AS "sourceHandle",
        COALESCE(sa.type, 'User') AS "sourceType",
        COALESCE(da.display_name, da.handle, CASE WHEN dw.type = 'platform wallets' THEN 'Platform Wallet' ELSE 'Unknown' END) AS "destinationName",
        da.handle AS "destinationHandle",
        COALESCE(da.type, 'User') AS "destinationType"
      FROM credit_transactions ct
      LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
      LEFT JOIN account_wallets saw ON saw.wallet_id = sw.wallet_id
      LEFT JOIN accounts sa ON sa.account_id = saw.account_id
      LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
      LEFT JOIN account_wallets daw ON daw.wallet_id = dw.wallet_id
      LEFT JOIN accounts da ON da.account_id = daw.account_id
      WHERE sw.type = 'account wallets'
         OR dw.type = 'account wallets'
      ORDER BY ct.created_at DESC
      LIMIT 100
    `).catch(() => ({ rows: [] })),

    pool.query(`
      SELECT
        c.cashout_id AS id,
        c.reference_id AS "referenceId",
        c.xendit_channel_code AS "channelCode",
        c.account_no AS "accountNo",
        c.account_name AS "accountName",
        c.amount_credits AS "amountCredits",
        (c.fee_php_cents / 100.0)::numeric(10,2) AS "feePhp",
        (c.net_amount_php_cents / 100.0)::numeric(10,2) AS "netAmountPhp",
        c.status,
        c.created_at AS "createdAt",
        COALESCE(a.display_name, a.handle, 'User') AS "userName",
        a.handle AS "userHandle"
      FROM cashouts c
      LEFT JOIN users u ON u.user_id = c.user_id
      LEFT JOIN accounts a ON a.account_id = u.account_id
      ORDER BY c.created_at DESC
      LIMIT 50
    `).catch(() => ({ rows: [] })),

    // Subscription Plans
    pool.query(`
      SELECT plan_id, name, description, billing_period, (amount_php_cents / 100.0)::numeric(10,2) AS amount_php, days_of_trials
      FROM plans
      WHERE deleted_at IS NULL
      ORDER BY amount_php_cents ASC
    `).catch(() => ({ rows: [] })),

    // Subscription Stats
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE LOWER(s.status) = 'active' AND LOWER(p.name) != 'free')::int AS active_paid_subscribers,
        COUNT(*) FILTER (WHERE LOWER(s.status) = 'active')::int AS total_active_subscriptions,
        COUNT(*) FILTER (WHERE LOWER(s.status) = 'active' AND LOWER(p.name) != 'free' AND s.cancel_at_period_end = FALSE)::int AS recurring_members,
        COUNT(*) FILTER (WHERE LOWER(s.status) = 'active' AND LOWER(p.name) != 'free' AND s.cancel_at_period_end = TRUE)::int AS canceling_members,
        COUNT(*) FILTER (WHERE LOWER(p.name) = 'free' OR s.subscription_id IS NULL)::int AS free_members
      FROM subscriptions s
      JOIN plans p ON p.plan_id = s.plan_id
    `).catch(() => ({ rows: [{ active_paid_subscribers: 0, total_active_subscriptions: 0, recurring_members: 0, canceling_members: 0, free_members: 0 }] })),

    // Subscription Invoices (Platform Subscription Transactions)
    pool.query(`
      SELECT
        si.subscription_invoice_id AS id,
        si.subscription_id AS "subscriptionId",
        p.name AS "planName",
        (si.amount_php_cents / 100.0)::numeric(10,2) AS "amountPhp",
        si.status,
        si.paid_at AS "paidAt",
        si.billing_period_start AS "periodStart",
        si.billing_period_end AS "periodEnd",
        si.created_at AS "createdAt",
        COALESCE(a.display_name, u.first_name || ' ' || u.last_name, a.handle, 'Unknown') AS "subscriberName",
        a.handle AS "subscriberHandle",
        u.email_address AS "subscriberEmail"
      FROM subscription_invoices si
      JOIN subscriptions s ON s.subscription_id = si.subscription_id
      JOIN plans p ON p.plan_id = s.plan_id
      JOIN users u ON u.user_id = s.user_id
      JOIN accounts a ON a.account_id = u.account_id
      ORDER BY si.created_at DESC
      LIMIT 100
    `).catch(() => ({ rows: [] })),

    // All Users with Subscription Status (Subscribed vs Not Subscribed)
    pool.query(`
      SELECT
        u.user_id AS "userId",
        COALESCE(a.display_name, u.first_name || ' ' || u.last_name, a.handle, 'Unknown') AS name,
        a.handle AS username,
        u.email_address AS email,
        a.created_at AS "joinedAt",
        s.subscription_id AS "subscriptionId",
        COALESCE(s.status, 'INACTIVE') AS "subscriptionStatus",
        COALESCE(p.name, 'Free') AS "planName",
        p.plan_id AS "planId",
        COALESCE((p.amount_php_cents / 100.0)::numeric(10,2), 0) AS "planAmountPhp",
        COALESCE(p.billing_period, 'MONTH') AS "billingPeriod",
        CASE
          WHEN s.subscription_id IS NOT NULL AND LOWER(s.status) = 'active' AND LOWER(COALESCE(p.name, '')) != 'free' THEN TRUE
          ELSE FALSE
        END AS "isSubscribed",
        CASE
          WHEN s.subscription_id IS NOT NULL AND LOWER(s.status) = 'active' AND LOWER(COALESCE(p.name, '')) != 'free' AND s.cancel_at_period_end = FALSE THEN TRUE
          ELSE FALSE
        END AS recurring,
        s.current_period_start AS "currentPeriodStart",
        s.current_period_end AS "currentPeriodEnd",
        s.next_billing_at AS "nextBillingAt",
        COALESCE((
          SELECT (SUM(amount_php_cents) / 100.0)::numeric(10,2)
          FROM subscription_invoices inv
          WHERE inv.subscription_id = s.subscription_id AND LOWER(inv.status) = 'paid'
        ), 0) AS "totalSpentPhp"
      FROM users u
      JOIN accounts a ON a.account_id = u.account_id
      LEFT JOIN LATERAL (
        SELECT *
        FROM subscriptions sub
        WHERE sub.user_id = u.user_id
        ORDER BY
          CASE WHEN LOWER(sub.status) = 'active' THEN 0 ELSE 1 END,
          sub.created_at DESC
        LIMIT 1
      ) s ON TRUE
      LEFT JOIN plans p ON p.plan_id = s.plan_id
      WHERE a.deleted_at IS NULL
      ORDER BY "isSubscribed" DESC, a.created_at DESC
    `).catch(() => ({ rows: [] })),

    // Top-up Stats
    pool.query(`
      SELECT
        COUNT(*)::int AS "totalCount",
        COUNT(*) FILTER (WHERE LOWER(status) = 'paid')::int AS "paidCount",
        COALESCE(SUM(amount) FILTER (WHERE LOWER(status) = 'paid'), 0)::numeric(12,2) AS "totalPaidPhp",
        COALESCE(SUM(credits) FILTER (WHERE LOWER(status) = 'paid'), 0)::bigint AS "totalCreditsIssued"
      FROM payments
      WHERE payment_type = 'TOPUP'
    `).catch(() => ({ rows: [{ totalCount: 0, paidCount: 0, totalPaidPhp: 0, totalCreditsIssued: 0 }] })),

    // Top-up Transactions
    pool.query(`
      SELECT
        p.id,
        p.reference_id AS "referenceId",
        p.payment_id AS "paymentId",
        p.channel_code AS "channelCode",
        p.amount::numeric(10,2) AS "amountPhp",
        p.credits AS "creditsGranted",
        p.currency,
        p.status,
        p.description,
        p.created_at AS "createdAt",
        p.processed_at AS "processedAt",
        COALESCE(a.display_name, u.first_name || ' ' || u.last_name, a.handle, 'User') AS "userName",
        a.handle AS "userHandle",
        u.email_address AS "userEmail",
        ct.credit_transaction_id AS "creditTransactionId"
      FROM payments p
      LEFT JOIN users u ON u.user_id = p.user_id
      LEFT JOIN accounts a ON a.account_id = u.account_id
      LEFT JOIN credit_transactions ct ON ct.reference_table = 'payments' AND ct.reference_id = p.id
      WHERE p.payment_type = 'TOPUP'
      ORDER BY p.created_at DESC
      LIMIT 100
    `).catch(() => ({ rows: [] }))
  ]);

  let milestoneFeesCredits = 0;
  let jobPostingFeesCredits = 0;
  let proposalFeesCredits = 0;
  let escrowHeldCredits = 0;
  let otherFeesCredits = 0;

  for (const r of feesRes.rows) {
    const credits = Number(r.total_credits || 0);
    const type = String(r.type || '').toLowerCase();
    const status = String(r.status || '').toLowerCase();

    if (type === 'fee') {
      if (status === 'completed') milestoneFeesCredits += credits;
    } else if (type === 'job posting fee') {
      if (status === 'completed') jobPostingFeesCredits += credits;
    } else if (type === 'proposal fee') {
      if (status === 'completed') proposalFeesCredits += credits;
    } else if (type === 'escrow hold') {
      if (status === 'held') escrowHeldCredits += credits;
    } else if (status === 'completed') {
      otherFeesCredits += credits;
    }
  }

  const totalFeeCredits = milestoneFeesCredits + jobPostingFeesCredits + proposalFeesCredits + otherFeesCredits;

  let totalPayoutCredits = 0;
  let totalPayoutPhp = 0;
  let cashoutFeesPhp = 0;
  let pendingPayoutCredits = 0;
  let pendingPayoutPhp = 0;
  let failedPayoutCredits = 0;
  let failedPayoutPhp = 0;

  let succeededCount = 0;
  let pendingCount = 0;
  let failedCount = 0;

  for (const r of cashoutStatsRes.rows) {
    const status = String(r.status || '').toUpperCase();
    const count = Number(r.count || 0);
    const credits = Number(r.total_credits || 0);
    const netPhp = Number(r.total_net_cents || 0) / 100.0;
    const feePhp = Number(r.total_fee_cents || 0) / 100.0;

    if (status === 'SUCCEEDED' || status === 'COMPLETED') {
      succeededCount += count;
      totalPayoutCredits += credits;
      totalPayoutPhp += netPhp;
      cashoutFeesPhp += feePhp;
    } else if (status === 'PENDING' || status === 'PROCESSING') {
      pendingCount += count;
      pendingPayoutCredits += credits;
      pendingPayoutPhp += netPhp;
    } else if (status === 'FAILED' || status === 'REJECTED') {
      failedCount += count;
      failedPayoutCredits += credits;
      failedPayoutPhp += netPhp;
    }
  }

  const totalPayoutCount = succeededCount + pendingCount + failedCount;
  const avgPayoutPhp = succeededCount > 0 ? Math.round((totalPayoutPhp / succeededCount) * 100) / 100 : 0;

  let topupRevenuePhp = 0;
  let subscriptionRevenuePhp = 0;
  let pendingPaymentsPhp = 0;

  for (const r of paymentsStatsRes.rows) {
    const type = String(r.payment_type || '').toUpperCase();
    const status = String(r.status || '').toUpperCase();
    const amount = Number(r.total_amount || 0);

    if (status === 'PAID' || status === 'COMPLETED') {
      if (type === 'TOPUP') topupRevenuePhp += amount;
      else if (type === 'SUBSCRIPTION') subscriptionRevenuePhp += amount;
    } else if (status === 'PENDING') {
      pendingPaymentsPhp += amount;
    }
  }

  // Add paid invoices to subscription revenue if payments table didn't record them
  const invoicePaidPhp = invoicesRes.rows
    .filter((inv) => String(inv.status).toLowerCase() === 'paid')
    .reduce((sum, inv) => sum + Number(inv.amountPhp || 0), 0);

  const effectiveSubscriptionRevenuePhp = Math.max(subscriptionRevenuePhp, invoicePaidPhp);
  const totalRevenuePhp = topupRevenuePhp + effectiveSubscriptionRevenuePhp + cashoutFeesPhp;

  const subsStats = subsStatsRes.rows[0] || {
    active_paid_subscribers: 0,
    total_active_subscriptions: 0,
    recurring_members: 0,
    canceling_members: 0,
    free_members: 0,
  };

  const subscriptionAnalytics = {
    summary: {
      activePaidSubscribers: Number(subsStats.active_paid_subscribers || 0),
      totalActiveSubscriptions: Number(subsStats.total_active_subscriptions || 0),
      recurringMembers: Number(subsStats.recurring_members || 0),
      cancelingMembers: Number(subsStats.canceling_members || 0),
      freeMembers: Number(subsStats.free_members || 0),
      subscriptionPlatformEarnPhp: Math.round(effectiveSubscriptionRevenuePhp * 100) / 100,
      availablePlans: plansRes.rows.map((p) => ({
        planId: p.plan_id,
        name: p.name,
        amountPhp: Number(p.amount_php || 0),
        billingPeriod: p.billing_period,
      })),
    },
    transactions: invoicesRes.rows,
    userSubscriptions: userSubsRes.rows,
  };

  return {
    platformRevenue: {
      platformWalletBalance: Number(platformWallet?.balance_credits || 0),
      platformWalletStatus: platformWallet?.status || 'active',
      totalRevenueCredits: totalFeeCredits,
      totalRevenuePhp: Math.round(totalRevenuePhp * 100) / 100,
      milestoneFeesCredits,
      jobPostingFeesCredits,
      proposalFeesCredits,
      otherFeesCredits,
      cashoutFeesPhp: Math.round(cashoutFeesPhp * 100) / 100,
      subscriptionRevenuePhp: Math.round(effectiveSubscriptionRevenuePhp * 100) / 100,
      topupRevenuePhp: Math.round(topupRevenuePhp * 100) / 100,
      escrowHeldCredits,
      pendingPaymentsPhp: Math.round(pendingPaymentsPhp * 100) / 100,
    },
    platformPayout: {
      totalPayoutCredits,
      totalPayoutPhp: Math.round(totalPayoutPhp * 100) / 100,
      pendingPayoutCredits,
      pendingPayoutPhp: Math.round(pendingPayoutPhp * 100) / 100,
      failedPayoutCredits,
      failedPayoutPhp: Math.round(failedPayoutPhp * 100) / 100,
      payoutCounts: {
        total: totalPayoutCount,
        succeeded: succeededCount,
        pending: pendingCount,
        failed: failedCount,
      },
      averagePayoutPhp: avgPayoutPhp,
      recentCashouts: recentCashoutsRes.rows,
    },
    platformTransactions: platformTxRes.rows,
    userTransactions: userTxRes.rows,
    subscriptionAnalytics,
    topupAnalytics: {
      summary: {
        totalCount: Number(topupStatsRes.rows[0]?.totalCount || 0),
        paidCount: Number(topupStatsRes.rows[0]?.paidCount || 0),
        totalPaidPhp: Number(topupStatsRes.rows[0]?.totalPaidPhp || 0),
        totalCreditsIssued: Number(topupStatsRes.rows[0]?.totalCreditsIssued || 0),
      },
      transactions: topupTxRes.rows,
    },
  };
}

async function fetchPlatformTransactionsList({ page = 1, limit = 50, type, status, search, direction } = {}) {
  const pwRes = await pool.query("SELECT wallet_id FROM wallets WHERE type = 'platform wallets' LIMIT 1");
  const platformWalletId = pwRes.rows[0]?.wallet_id;
  if (!platformWalletId) return { items: [], total: 0, page, limit };

  const conditions = [
    `(ct.source_wallet_id = $1 OR ct.destination_wallet_id = $1 OR ct.type IN ('Fee', 'Job Posting Fee', 'Proposal Fee'))`
  ];
  const params = [platformWalletId];
  let pIdx = 2;

  if (type && type !== 'all') {
    conditions.push(`LOWER(ct.type) = LOWER($${pIdx})`);
    params.push(type);
    pIdx++;
  }

  if (status && status !== 'all') {
    conditions.push(`LOWER(ct.status) = LOWER($${pIdx})`);
    params.push(status);
    pIdx++;
  }

  if (direction && direction !== 'all') {
    if (direction === 'inflow') {
      conditions.push(`(ct.destination_wallet_id = $1 OR ct.type IN ('Fee', 'Job Posting Fee', 'Proposal Fee'))`);
    } else if (direction === 'outflow') {
      conditions.push(`ct.source_wallet_id = $1`);
    }
  }

  if (search && search.trim()) {
    conditions.push(`(
      ct.credit_transaction_id::text ILIKE $${pIdx} OR
      COALESCE(sa.handle, '') ILIKE $${pIdx} OR
      COALESCE(sa.display_name, '') ILIKE $${pIdx} OR
      COALESCE(da.handle, '') ILIKE $${pIdx} OR
      COALESCE(da.display_name, '') ILIKE $${pIdx}
    )`);
    params.push(`%${search.trim()}%`);
    pIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM credit_transactions ct
    LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
    LEFT JOIN account_wallets saw ON saw.wallet_id = sw.wallet_id
    LEFT JOIN accounts sa ON sa.account_id = saw.account_id
    LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
    LEFT JOIN account_wallets daw ON daw.wallet_id = dw.wallet_id
    LEFT JOIN accounts da ON da.account_id = daw.account_id
    ${whereClause}
  `;

  const offset = (Math.max(1, page) - 1) * limit;
  const listQuery = `
    SELECT
      ct.credit_transaction_id AS id,
      ct.type,
      ct.amount_credits AS "amountCredits",
      ct.status,
      ct.created_at AS "createdAt",
      ct.reference_table AS "referenceTable",
      CASE
        WHEN ct.type IN ('Fee', 'Job Posting Fee', 'Proposal Fee') THEN 'inflow'
        WHEN ct.destination_wallet_id = $1 THEN 'inflow'
        WHEN ct.source_wallet_id = $1 THEN 'outflow'
        ELSE 'inflow'
      END AS direction,
      CASE
        WHEN ct.type IN ('Fee', 'Job Posting Fee', 'Proposal Fee') THEN ct.amount_credits
        WHEN ct.destination_wallet_id = $1 THEN ct.amount_credits
        ELSE 0
      END AS "revenueCredits",
      CASE
        WHEN ct.destination_wallet_id = $1 THEN
          COALESCE(sa.display_name, sa.handle, 'System')
        ELSE
          COALESCE(da.display_name, da.handle, 'System')
      END AS "counterpartyName",
      CASE
        WHEN ct.destination_wallet_id = $1 THEN sa.handle
        ELSE da.handle
      END AS "counterpartyHandle",
      CASE
        WHEN ct.destination_wallet_id = $1 THEN COALESCE(sa.type, 'User')
        ELSE COALESCE(da.type, 'User')
      END AS "counterpartyType"
    FROM credit_transactions ct
    LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
    LEFT JOIN account_wallets saw ON saw.wallet_id = sw.wallet_id
    LEFT JOIN accounts sa ON sa.account_id = saw.account_id
    LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
    LEFT JOIN account_wallets daw ON daw.wallet_id = dw.wallet_id
    LEFT JOIN accounts da ON da.account_id = daw.account_id
    ${whereClause}
    ORDER BY ct.created_at DESC
    LIMIT $${pIdx} OFFSET $${pIdx + 1}
  `;

  params.push(limit, offset);

  const [totalRes, listRes] = await Promise.all([
    pool.query(countQuery, params.slice(0, pIdx - 1)),
    pool.query(listQuery, params)
  ]);

  return {
    items: listRes.rows,
    total: totalRes.rows[0]?.total || 0,
    page: Number(page),
    limit: Number(limit)
  };
}

async function fetchUserTransactionsList({ page = 1, limit = 50, type, status, search } = {}) {
  const conditions = [
    `(sw.type = 'account wallets' OR dw.type = 'account wallets')`
  ];
  const params = [];
  let pIdx = 1;

  if (type && type !== 'all') {
    conditions.push(`LOWER(ct.type) = LOWER($${pIdx})`);
    params.push(type);
    pIdx++;
  }

  if (status && status !== 'all') {
    conditions.push(`LOWER(ct.status) = LOWER($${pIdx})`);
    params.push(status);
    pIdx++;
  }

  if (search && search.trim()) {
    conditions.push(`(
      ct.credit_transaction_id::text ILIKE $${pIdx} OR
      COALESCE(sa.handle, '') ILIKE $${pIdx} OR
      COALESCE(sa.display_name, '') ILIKE $${pIdx} OR
      COALESCE(da.handle, '') ILIKE $${pIdx} OR
      COALESCE(da.display_name, '') ILIKE $${pIdx}
    )`);
    params.push(`%${search.trim()}%`);
    pIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM credit_transactions ct
    LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
    LEFT JOIN account_wallets saw ON saw.wallet_id = sw.wallet_id
    LEFT JOIN accounts sa ON sa.account_id = saw.account_id
    LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
    LEFT JOIN account_wallets daw ON daw.wallet_id = dw.wallet_id
    LEFT JOIN accounts da ON da.account_id = daw.account_id
    ${whereClause}
  `;

  const offset = (Math.max(1, page) - 1) * limit;
  const listQuery = `
    SELECT
      ct.credit_transaction_id AS id,
      ct.type,
      ct.amount_credits AS "amountCredits",
      ct.status,
      ct.created_at AS "createdAt",
      ct.reference_table AS "referenceTable",
      ct.reference_id AS "referenceId",
      ct.fee_transaction_id AS "feeTransactionId",
      sw.type AS "sourceWalletType",
      dw.type AS "destWalletType",
      COALESCE(sa.display_name, sa.handle, CASE WHEN sw.type = 'platform wallets' THEN 'Platform Wallet' ELSE 'Unknown' END) AS "sourceName",
      sa.handle AS "sourceHandle",
      COALESCE(sa.type, 'User') AS "sourceType",
      COALESCE(da.display_name, da.handle, CASE WHEN dw.type = 'platform wallets' THEN 'Platform Wallet' ELSE 'Unknown' END) AS "destinationName",
      da.handle AS "destinationHandle",
      COALESCE(da.type, 'User') AS "destinationType"
    FROM credit_transactions ct
    LEFT JOIN wallets sw ON sw.wallet_id = ct.source_wallet_id
    LEFT JOIN account_wallets saw ON saw.wallet_id = sw.wallet_id
    LEFT JOIN accounts sa ON sa.account_id = saw.account_id
    LEFT JOIN wallets dw ON dw.wallet_id = ct.destination_wallet_id
    LEFT JOIN account_wallets daw ON daw.wallet_id = dw.wallet_id
    LEFT JOIN accounts da ON da.account_id = daw.account_id
    ${whereClause}
    ORDER BY ct.created_at DESC
    LIMIT $${pIdx} OFFSET $${pIdx + 1}
  `;

  params.push(limit, offset);

  const [totalRes, listRes] = await Promise.all([
    pool.query(countQuery, params.slice(0, pIdx - 1)),
    pool.query(listQuery, params)
  ]);

  return {
    items: listRes.rows,
    total: totalRes.rows[0]?.total || 0,
    page: Number(page),
    limit: Number(limit)
  };
}

async function fetchTopupTransactionsList({ page = 1, limit = 50, status, channel, search } = {}) {
  const conditions = [`p.payment_type = 'TOPUP'`];
  const params = [];
  let pIdx = 1;

  if (status && status !== 'all') {
    conditions.push(`LOWER(p.status) = LOWER($${pIdx})`);
    params.push(status);
    pIdx++;
  }

  if (channel && channel !== 'all') {
    conditions.push(`LOWER(p.channel_code) = LOWER($${pIdx})`);
    params.push(channel);
    pIdx++;
  }

  if (search && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    conditions.push(`(
      LOWER(p.id::text) LIKE $${pIdx}
      OR LOWER(p.reference_id) LIKE $${pIdx}
      OR LOWER(COALESCE(p.payment_id, '')) LIKE $${pIdx}
      OR LOWER(COALESCE(a.display_name, '')) LIKE $${pIdx}
      OR LOWER(COALESCE(a.handle, '')) LIKE $${pIdx}
      OR LOWER(COALESCE(u.email_address, '')) LIKE $${pIdx}
      OR LOWER(COALESCE(p.channel_code, '')) LIKE $${pIdx}
    )`);
    params.push(q);
    pIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM payments p
    LEFT JOIN users u ON u.user_id = p.user_id
    LEFT JOIN accounts a ON a.account_id = u.account_id
    ${whereClause}
  `;
  const countRes = await pool.query(countQuery, params);
  const total = countRes.rows[0]?.total || 0;

  const offset = (Math.max(1, page) - 1) * limit;
  params.push(limit, offset);

  const query = `
    SELECT
      p.id,
      p.reference_id AS "referenceId",
      p.payment_id AS "paymentId",
      p.channel_code AS "channelCode",
      p.amount::numeric(10,2) AS "amountPhp",
      p.credits AS "creditsGranted",
      p.currency,
      p.status,
      p.description,
      p.created_at AS "createdAt",
      p.processed_at AS "processedAt",
      COALESCE(a.display_name, u.first_name || ' ' || u.last_name, a.handle, 'User') AS "userName",
      a.handle AS "userHandle",
      u.email_address AS "userEmail",
      ct.credit_transaction_id AS "creditTransactionId"
    FROM payments p
    LEFT JOIN users u ON u.user_id = p.user_id
    LEFT JOIN accounts a ON a.account_id = u.account_id
    LEFT JOIN credit_transactions ct ON ct.reference_table = 'payments' AND ct.reference_id = p.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${pIdx} OFFSET $${pIdx + 1}
  `;

  const itemsRes = await pool.query(query, params);
  return {
    items: itemsRes.rows,
    total,
    page: Number(page),
    limit: Number(limit),
  };
}

module.exports = {
  getAnalyticsOverview,
  fetchPlatformEconomyDetails,
  fetchPlatformTransactionsList,
  fetchUserTransactionsList,
  fetchTopupTransactionsList,
};
