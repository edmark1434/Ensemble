const { pool } = require('../lib/database');
const { getMongoClient, connectMongoDB } = require('../lib/mongodb');

const CREDIT_MULTIPLIER = 1000;

function normalizeStatus(status) {
  if (!status) return 'Pending';
  const s = String(status).toLowerCase();
  if (s === 'active') return 'Active';
  if (s.includes('suspend')) return 'Suspended';
  if (s.includes('ban')) return 'Banned';
  return status;
}

function deriveVerification(row) {
  if (normalizeStatus(row.status) !== 'Active') return 'Pending review';
  if (row.firebase_user_uuid && row.xendit_customer_id) return 'Fully verified';
  if (row.firebase_user_uuid || row.xendit_customer_id) return 'Partially verified';
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
      u.xendit_customer_id,
      a.handle,
      a.display_name,
      a.status,
      a.merit_score,
      a.avatar_file_id,
      a.tagline,
      a.created_at
    FROM users u
    INNER JOIN accounts a ON a.account_id = u.account_id
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
      credits: (r.merit_score ?? 0) * CREDIT_MULTIPLIER,
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
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'Mon DD') AS week_label,
      DATE_TRUNC('week', created_at) AS week_start,
      COUNT(*)::int AS signups
    FROM accounts
    WHERE deleted_at IS NULL AND type = 'User'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week_start ASC
    LIMIT 24
  `);
  let cumulative = 0;
  return result.rows.map((r) => {
    cumulative += r.signups;
    return {
      week: r.week_label,
      weekStart: r.week_start,
      newMembers: r.signups,
      cumulativeMembers: cumulative,
    };
  });
}

async function fetchSignupByMonth() {
  const result = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month_label,
      DATE_TRUNC('month', created_at) AS month_start,
      COUNT(*)::int AS signups
    FROM accounts
    WHERE deleted_at IS NULL AND type = 'User'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month_start ASC
    LIMIT 12
  `);
  return result.rows.map((r) => ({
    label: r.month_label,
    monthStart: r.month_start,
    value: r.signups,
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
  return signupTrend.map((w, i) => ({
    label: w.week,
    weekStart: w.weekStart,
    signups: w.newMembers,
    estimatedDau: Math.max(1, Math.round((w.cumulativeMembers || totalMembers) * 0.11)),
    estimatedWau: Math.max(1, Math.round((w.cumulativeMembers || totalMembers) * 0.27)),
    estimatedMau: Math.max(1, Math.round((w.cumulativeMembers || totalMembers) * 0.62)),
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

    const [groups, discussions, activeCount, inactiveCount] = await Promise.all([
      groupsCol.find({}).sort({ created_at: -1 }).limit(30).toArray(),
      discussionsCol.find({}).sort({ created_at: -1 }).limit(20).toArray(),
      groupsCol.countDocuments({ status: 'active' }),
      groupsCol.countDocuments({ status: { $ne: 'active' } }),
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
        total: groups.length,
        active: activeCount,
        inactive: inactiveCount,
        totalMembers: memberTotal,
        avgMembersPerGroup: groups.length ? Math.round((memberTotal / groups.length) * 10) / 10 : 0,
      },
      discussions: {
        total: await discussionsCol.countDocuments(),
        sampledComments: commentTotal,
        avgComments: discussions.length ? Math.round((commentTotal / discussions.length) * 10) / 10 : 0,
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

function buildPlatformAlerts(members, forum, pendingCount, suspendedCount) {
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
  const [members, staffRoles, signupTrend, accountCounts, forum] = await Promise.all([
    fetchPlatformMembers(),
    fetchStaffSummary(),
    fetchSignupTrend(),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE type = 'User' AND deleted_at IS NULL)::int AS users,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'active' AND type = 'User' AND deleted_at IS NULL)::int AS active_users,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) != 'active' AND type = 'User' AND deleted_at IS NULL)::int AS non_active_users,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) LIKE '%suspend%' AND type = 'User')::int AS suspended_users
      FROM accounts
    `),
    fetchForumPlatformStats(),
  ]);

  const counts = accountCounts.rows[0];
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === 'Active').length;
  const verifiedMembers = members.filter((m) => m.verification === 'Fully verified').length;
  const pendingMembers = members.filter((m) => m.verification === 'Pending review' || m.status !== 'Active').length;
  const suspendedMembers = Number(counts.suspended_users);

  const withAvatar = members.filter((m) => m.hasAvatar).length;
  const withTagline = members.filter((m) => m.hasTagline).length;
  const profileCompleteRate = totalMembers
    ? Math.round(((withAvatar + withTagline) / (totalMembers * 2)) * 100)
    : 0;

  const totalMerit = members.reduce((s, m) => s + m.merit, 0);
  const totalCredits = members.reduce((s, m) => s + m.credits, 0);

  const lastWeek = signupTrend.length ? signupTrend[signupTrend.length - 1].newMembers : 0;
  const prevWeek = signupTrend.length > 1 ? signupTrend[signupTrend.length - 2].newMembers : lastWeek;
  const growthPercent =
    prevWeek > 0 ? Math.round(((lastWeek - prevWeek) / prevWeek) * 100) : lastWeek > 0 ? 100 : 0;

  const engagementScore = computeEngagementScore(members, forum, profileCompleteRate);

  const estimatedMau = Math.max(1, Math.round(totalMembers * 0.62));
  const estimatedWau = Math.max(1, Math.round(totalMembers * 0.27));
  const estimatedDau = Math.max(1, Math.round(totalMembers * 0.11));

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

  const verificationChart = [
    { label: 'Fully verified', value: members.filter((m) => m.verification === 'Fully verified').length, color: '#34d399' },
    { label: 'Partial', value: members.filter((m) => m.verification === 'Partially verified').length, color: '#fbbf24' },
    { label: 'Unverified', value: members.filter((m) => m.verification === 'Unverified').length, color: '#71717a' },
    { label: 'Pending', value: members.filter((m) => m.verification === 'Pending review').length, color: '#f87171' },
  ].filter((x) => x.value > 0);

  const statusChart = [
    { label: 'Active', value: activeMembers, color: '#34d399' },
    { label: 'Suspended', value: suspendedMembers, color: '#fbbf24' },
    { label: 'Other', value: totalMembers - activeMembers - suspendedMembers, color: '#a1a1aa' },
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
      pendingVerifications: pendingMembers,
    },
    alerts: buildPlatformAlerts(members, forum, pendingMembers, suspendedMembers),
    growth: {
      signupsByWeek: signupTrend,
      signupsByMonth,
      engagementTrend,
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
    },
    operations: {
      moderationTeam: staffRoles,
      activeModerators: staffRoles.reduce((s, r) => s + r.active, 0),
      pendingVerifications: pendingMembers,
      suspendedAccounts: suspendedMembers,
      nonActiveAccounts: Number(counts.non_active_users),
      platformHealthScore: engagementScore,
    },
    insights: buildInsights(members, forum, growthPercent, engagementScore),
    comingSoon: {
      title: 'Metrics coming when these modules launch',
      modules: [
        { name: 'Jobs & gigs', metrics: 'Postings, applications, completion rate' },
        { name: 'Marketplace', metrics: 'Listings, sales, revenue' },
        { name: 'Production teams', metrics: 'Team count, collaboration sessions' },
        { name: 'Projects', metrics: 'Active projects, deliverables' },
        { name: 'Video editor', metrics: 'Renders, export volume' },
        { name: 'Session analytics', metrics: 'DAU/WAU from real session data' },
      ],
    },
  };
}

function buildInsights(members, forum, growth, engagement) {
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

  if (engagement >= 70) {
    insights.push({
      id: 'engage',
      title: 'Healthy engagement',
      detail: `Platform engagement score is ${engagement}/100 based on members, profiles, and community data.`,
      type: 'positive',
    });
  }

  return insights;
}

module.exports = { getAnalyticsOverview };
