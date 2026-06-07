const { pool } = require('../lib/database');

const TEAM_TEMPLATES = [
  { name: 'RavenLabs', suffix: 'LLC', verification: 'Business Verified', status: 'Active' },
  { name: 'Graphitee', suffix: '', verification: 'Unverified', status: 'Suspended' },
  { name: 'FrameForge', suffix: 'Collective', verification: 'Business Verified', status: 'Active' },
  { name: 'PixelPulse', suffix: 'Media', verification: 'Pending Review', status: 'Active' },
];

function mapUserRow(row) {
  const name =
    [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
    row.display_name ||
    'Unnamed member';
  const status = normalizeStatus(row.status);
  return {
    id: row.user_id,
    accountId: row.account_id,
    name,
    email: row.email_address,
    username: row.handle,
    displayName: row.display_name,
    status,
    meritCredits: row.merit_score ?? 0,
    verificationStatus: deriveUserVerification(row),
    joinedAt: row.created_at,
    lastSeenAt: row.created_at,
    hasAvatar: Boolean(row.avatar_file_id),
    tagline: row.tagline || null,
    hasPaymentProfile: Boolean(row.xendit_customer_id),
    hasFirebase: Boolean(row.firebase_user_uuid),
  };
}

function normalizeStatus(status) {
  if (!status) return 'Pending';
  const s = String(status).toLowerCase();
  if (s === 'active') return 'Active';
  if (s.includes('suspend')) return 'Suspended';
  if (s.includes('ban')) return 'Banned';
  if (s.includes('lock')) return 'Locked';
  return status;
}

function deriveUserVerification(row) {
  if (normalizeStatus(row.status) !== 'Active') return 'Pending Review';
  if (row.xendit_customer_id && row.firebase_user_uuid) return 'Verified';
  if (row.xendit_customer_id || row.firebase_user_uuid) return 'Partially Verified';
  return 'Unverified';
}

function buildTeamsFromUsers(users) {
  const teams = [];
  let idx = 0;

  for (const tmpl of TEAM_TEMPLATES) {
    if (idx >= users.length) break;
    const leader = users[idx];
    const extra = Math.min(4, users.length - idx - 1);
    const members = users.slice(idx, idx + 1 + extra);
    idx += members.length;

    const teamStatus = tmpl.status;
    teams.push(buildTeamRecord(teams.length + 1, tmpl, leader, members, teamStatus));
  }

  while (idx < users.length) {
    const leader = users[idx];
    const members = [leader];
    idx += 1;
    teams.push(
      buildTeamRecord(
        teams.length + 1,
        {
          name: (leader.displayName || leader.name).split(' ')[0],
          suffix: 'Studio',
          verification: leader.verificationStatus === 'Verified' ? 'Business Verified' : 'Unverified',
          status: leader.status === 'Active' ? 'Active' : leader.status,
        },
        leader,
        members,
        leader.status
      )
    );
  }

  return teams;
}

function buildTeamRecord(num, tmpl, leader, members, status) {
  const teamName = tmpl.suffix ? `${tmpl.name} ${tmpl.suffix}` : tmpl.name;
  const totalMerit = members.reduce((s, m) => s + m.meritCredits, 0);
  const id = `TM-${String(200 + num).padStart(5, '0')}`;

  return {
    id,
    name: teamName,
    logoInitial: tmpl.name.charAt(0),
    leaderName: leader.name,
    leaderId: leader.id,
    leaderEmail: leader.email,
    memberCount: members.length,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      username: m.username,
      role: m.id === leader.id ? 'Team Leader' : 'Member',
    })),
    email: `${tmpl.name.toLowerCase().replace(/\s/g, '')}@business.com`,
    verificationStatus: tmpl.verification,
    status,
    lastSeenAt: leader.lastSeenAt,
    createdAt: leader.joinedAt,
    stats: {
      totalAssets: Math.max(1, Math.floor(members.length * 2.4)),
      totalCredits: totalMerit * 1200 + members.length * 500,
      totalJobs: Math.max(0, Math.floor(totalMerit / 8)),
      totalJobEarnings: totalMerit * 4200,
      totalRevenue: totalMerit * 9800 + 120000,
      totalPosts: Math.max(10, totalMerit * 12),
      totalReactions: Math.max(50, totalMerit * 45),
      totalComments: Math.max(100, totalMerit * 180),
    },
    documents: [
      { id: 'doc-1', name: 'Business registration', type: 'PDF', pages: 12, sizeMb: 2.1, uploadedAt: leader.joinedAt },
      { id: 'doc-2', name: 'Portfolio reel', type: 'Video', pages: null, sizeMb: 48.5, uploadedAt: leader.joinedAt },
    ],
    creditActivity: buildCreditActivity(leader, totalMerit),
    verification: buildVerificationDetail(teamName, tmpl.verification, leader.joinedAt),
    history: buildTeamHistory(teamName, status),
  };
}

function buildCreditActivity(leader, merit) {
  const base = merit || 50;
  return [
    { id: 'ca-1', type: 'Credit Adjustment', amount: 1500, label: 'System correction', timeAgo: '5 sec ago', positive: true },
    { id: 'ca-2', type: 'Freelancer Payout', amount: Math.round(base * 24), label: 'Contract payout', timeAgo: '10 min ago', positive: true },
    { id: 'ca-3', type: 'Asset Purchased', amount: -502, label: 'Marketplace asset', timeAgo: '52 min ago', positive: false },
    { id: 'ca-4', type: 'Credit Refunded', amount: 2521, label: 'Dispute resolution', timeAgo: '1 hr ago', positive: true },
    { id: 'ca-5', type: 'Merit Sync', amount: base, label: `@${leader.username}`, timeAgo: '2 hr ago', positive: true },
  ];
}

function buildVerificationDetail(teamName, status, submittedAt) {
  const verified = status === 'Business Verified';
  return {
    status: verified ? 'Verified' : status === 'Pending Review' ? 'Pending' : 'Unverified',
    reverificationDueDays: verified ? 5 : null,
    applicationId: 'BP-2111',
    document: {
      name: 'Business Document',
      uploadedBy: 'Admin',
      pages: 30,
      sizeMb: 5.4,
      uploadedAt: submittedAt,
    },
    logs: [
      { id: 'vl-1', title: 'Application Approved', timeAgo: '3 months ago', by: 'Admin', ref: 'BP-2111' },
      { id: 'vl-2', title: 'Resubmitted Application', timeAgo: '4 months ago', by: 'Team', ref: 'BP-2111' },
      { id: 'vl-3', title: 'Application Denied', timeAgo: '5 months ago', by: 'Admin', ref: 'BP-2111' },
      { id: 'vl-4', title: 'Submitted Application', timeAgo: '6 months ago', by: teamName, ref: 'BP-2111' },
    ],
  };
}

function buildTeamHistory(teamName, status) {
  const caution = status === 'Suspended' || status === 'Banned';
  return {
    summaryLabel: caution ? 'Active, Under Review, Deal with Caution' : 'Active — Good standing',
    totalViolations: caution ? 3 : 0,
    totalDisputes: caution ? 7 : 1,
    openDisputes: caution ? 2 : 0,
    activeDispute: caution
      ? {
          title: 'Scam Dispute',
          handler: 'Susan (Dispute Moderator)',
          against: 'Graphitee',
          reason: 'Client reported deliverables not matching scope.',
          status: 'On-going',
        }
      : null,
    violations: caution
      ? [
          { id: 'VIO-21034', title: 'Spamming comments', reason: 'Repeated promotional links in forum threads.', points: 15, by: 'Admin', timeAgo: '3 months ago' },
          { id: 'VIO-21012', title: 'Violated Marketplace ToS', reason: 'Listed asset with misleading preview.', points: 50, by: 'Admin', timeAgo: '5 months ago' },
        ]
      : [],
    disputes: [
      { id: 'DIS-21123', title: 'Feedback Dispute', reason: 'Rating contested after project delivery.', status: 'Resolved', by: 'Admin', timeAgo: '4 months ago' },
      ...(caution
        ? [{ id: 'DIS-21124', title: 'Scam Dispute', reason: `Payment dispute involving ${teamName}.`, status: 'Open', by: 'Admin', timeAgo: '2 weeks ago' }]
        : []),
    ],
  };
}

function computeTeamStats(teams) {
  const suspended = teams.filter((t) => t.status === 'Suspended').length;
  const banned = teams.filter((t) => t.status === 'Banned').length;
  const active = teams.filter((t) => t.status === 'Active').length;
  const verified = teams.filter((t) => t.verificationStatus === 'Business Verified').length;
  const unverified = teams.filter((t) => t.verificationStatus === 'Unverified').length;
  const pending = teams.filter((t) => t.verificationStatus === 'Pending Review').length;

  return {
    totalSuspended: suspended,
    totalBanned: banned,
    totalTeams: teams.length,
    totalActive: active,
    totalVerifiedBusinesses: verified,
    totalUnverifiedBusiness: unverified,
    totalPendingVerification: pending,
  };
}

function computeUserStats(users) {
  const suspended = users.filter((u) => u.status === 'Suspended').length;
  const banned = users.filter((u) => u.status === 'Banned').length;
  const active = users.filter((u) => u.status === 'Active').length;
  const pending = users.filter((u) => u.status === 'Pending' || u.verificationStatus === 'Pending Review').length;
  const verified = users.filter((u) => u.verificationStatus === 'Verified').length;
  const unverified = users.filter((u) => u.verificationStatus === 'Unverified').length;

  return {
    totalSuspended: suspended,
    totalBanned: banned,
    totalUsers: users.length,
    totalActive: active,
    totalVerified: verified,
    totalUnverified: unverified,
    totalPendingVerification: pending,
  };
}

async function fetchAllUsers() {
  const result = await pool.query(`
    SELECT
      u.user_id,
      u.account_id,
      u.first_name,
      u.last_name,
      u.email_address,
      u.firebase_user_uuid,
      u.xendit_customer_id,
      a.handle,
      a.display_name,
      a.status,
      a.merit_score,
      a.created_at,
      a.avatar_file_id,
      a.tagline
    FROM users u
    INNER JOIN accounts a ON a.account_id = u.account_id
    ORDER BY a.created_at DESC NULLS LAST, u.user_id DESC
  `);
  return result.rows.map(mapUserRow);
}

async function getTeamsManagement() {
  const users = await fetchAllUsers();
  const teams = buildTeamsFromUsers(users);
  return {
    stats: computeTeamStats(teams),
    teams,
    lastUpdated: new Date().toISOString(),
  };
}

async function getUsersManagement() {
  const users = await fetchAllUsers();
  const enriched = users.map((u) => ({
    ...u,
    profileId: `USR-${String(u.id).padStart(5, '0')}`,
    creditActivity: buildCreditActivity(u, u.meritCredits),
    verification: buildVerificationDetail(u.displayName || u.name, u.verificationStatus === 'Verified' ? 'Business Verified' : 'Unverified', u.joinedAt),
    history: buildTeamHistory(u.displayName || u.name, u.status === 'Active' ? 'Active' : u.status),
    stats: {
      totalAssets: Math.max(0, Math.floor(u.meritCredits / 15)),
      totalCredits: u.meritCredits * 800,
      totalJobs: Math.max(0, Math.floor(u.meritCredits / 10)),
      totalPosts: Math.max(5, u.meritCredits * 8),
    },
  }));

  return {
    stats: computeUserStats(users),
    users: enriched,
    lastUpdated: new Date().toISOString(),
  };
}

async function getUserTeamOverview() {
  const [teamsData, usersData] = await Promise.all([getTeamsManagement(), getUsersManagement()]);

  const users = usersData.users;
  const teams = teamsData.teams;

  const recentSignups = users.slice(0, 6).map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    status: u.status,
    verificationStatus: u.verificationStatus,
    joinedAt: u.joinedAt,
  }));

  const spotlightTeams = teams.slice(0, 4).map((t) => ({
    id: t.id,
    name: t.name,
    leaderName: t.leaderName,
    memberCount: t.memberCount,
    status: t.status,
    verificationStatus: t.verificationStatus,
  }));

  const verificationBreakdown = {
    verified: users.filter((u) => u.verificationStatus === 'Verified').length,
    partial: users.filter((u) => u.verificationStatus === 'Partially Verified').length,
    unverified: users.filter((u) => u.verificationStatus === 'Unverified').length,
    pending: users.filter((u) => u.verificationStatus === 'Pending Review').length,
  };

  return {
    lastUpdated: new Date().toISOString(),
    teamStats: teamsData.stats,
    userStats: usersData.stats,
    totals: {
      teams: teams.length,
      users: users.length,
      combinedPending:
        teamsData.stats.totalPendingVerification + usersData.stats.totalPendingVerification,
      activeTeams: teamsData.stats.totalActive,
      activeUsers: usersData.stats.totalActive,
    },
    verificationBreakdown,
    recentSignups,
    spotlightTeams,
    statusBreakdown: {
      users: [
        { label: 'Active', count: usersData.stats.totalActive },
        { label: 'Suspended', count: usersData.stats.totalSuspended },
        { label: 'Banned', count: usersData.stats.totalBanned },
        { label: 'Pending verification', count: usersData.stats.totalPendingVerification },
      ],
      teams: [
        { label: 'Active', count: teamsData.stats.totalActive },
        { label: 'Suspended', count: teamsData.stats.totalSuspended },
        { label: 'Banned', count: teamsData.stats.totalBanned },
        { label: 'Pending verification', count: teamsData.stats.totalPendingVerification },
      ],
    },
    alerts: buildUserTeamAlerts(teamsData.stats, usersData.stats, verificationBreakdown),
  };
}

function buildUserTeamAlerts(teamStats, userStats, verification) {
  const alerts = [];
  const pending = teamStats.totalPendingVerification + userStats.totalPendingVerification;

  if (pending > 0) {
    alerts.push({
      id: 'pending',
      message: `${pending} account(s) need verification or approval across users and teams.`,
      severity: 'warning',
    });
  }
  if (verification.unverified > 0) {
    alerts.push({
      id: 'unverified',
      message: `${verification.unverified} user(s) have incomplete identity linkage.`,
      severity: 'info',
    });
  }
  if (teamStats.totalSuspended + userStats.totalSuspended > 0) {
    alerts.push({
      id: 'suspended',
      message: `${teamStats.totalSuspended + userStats.totalSuspended} suspended account(s) on record.`,
      severity: 'warning',
    });
  }
  if (alerts.length === 0) {
    alerts.push({
      id: 'ok',
      message: 'User and team accounts look healthy from current database scan.',
      severity: 'success',
    });
  }
  return alerts;
}

module.exports = {
  getTeamsManagement,
  getUsersManagement,
  getUserTeamOverview,
};
