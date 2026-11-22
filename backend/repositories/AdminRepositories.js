const { pool } = require('../lib/Database');
const { getMongoClient, connectMongoDB } = require('../lib/MongoDb');
const { fetchMemberSummary } = require('./AdminAnalyticsRepositories');
const { FORUM_TIMEOUT_MATCH } = require('./ModeratorRepositories');

/** Member accounts (not staff or teams) that still exist, as Analytics counts them. */
const LIVE_MEMBER = `a.type = 'User' AND a.deleted_at IS NULL`;

/**
 * This week's member pulse for the dashboard's Members card: signups this week and last,
 * members active this week, and members carrying an active warning or a forum timeout.
 */
async function fetchMemberPulse() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM accounts a
        WHERE ${LIVE_MEMBER} AND a.created_at >= NOW() - INTERVAL '7 days') AS new_this_week,
      (SELECT COUNT(*)::int FROM accounts a
        WHERE ${LIVE_MEMBER}
          AND a.created_at >= NOW() - INTERVAL '14 days'
          AND a.created_at < NOW() - INTERVAL '7 days') AS new_last_week,
      (SELECT COUNT(DISTINCT d.account_id)::int
        FROM account_active_days d
        INNER JOIN accounts a ON a.account_id = d.account_id
        WHERE ${LIVE_MEMBER} AND d.active_on > CURRENT_DATE - 7) AS active_this_week,
      (SELECT COUNT(DISTINCT v.account_id)::int
        FROM violations v
        INNER JOIN accounts a ON a.account_id = v.account_id
        WHERE ${LIVE_MEMBER}
          AND v.deleted_at IS NULL
          AND LOWER(COALESCE(v.status, 'active')) IN ('active', 'open')
          AND (v.expires_at IS NULL OR v.expires_at > NOW())) AS with_active_warnings,
      (SELECT COUNT(DISTINCT r.account_id)::int
        FROM restrictions r
        INNER JOIN accounts a ON a.account_id = r.account_id
        WHERE ${LIVE_MEMBER} AND ${FORUM_TIMEOUT_MATCH}) AS forum_timeouts
  `);
  const r = result.rows[0] || {};
  return {
    newThisWeek: Number(r.new_this_week || 0),
    newLastWeek: Number(r.new_last_week || 0),
    activeThisWeek: Number(r.active_this_week || 0),
    withActiveWarnings: Number(r.with_active_warnings || 0),
    forumTimeouts: Number(r.forum_timeouts || 0),
  };
}

async function getForumCounts() {
  let client = getMongoClient();
  if (!client) client = await connectMongoDB();
  if (!client) {
    return { groups: 0, discussions: 0, available: false };
  }
  try {
    const db = client.db('ensemble');
    const [groups, discussions] = await Promise.all([
      db.collection('forum_groups').countDocuments({ status: 'active' }).catch(() =>
        db.collection('forum_groups').countDocuments()
      ),
      db.collection('forum_discussions').countDocuments(),
    ]);
    return { groups, discussions, available: true };
  } catch {
    return { groups: 0, discussions: 0, available: false };
  }
}

/**
 * Contract workspaces (`teams.team_type = 'contractual'`) are job/gig scaffolding, not team
 * accounts: they never verify or wait for approval, so the queue and its counts skip them.
 */
const NOT_CONTRACT_WORKSPACE = (accountIdColumn) => `NOT EXISTS (
  SELECT 1 FROM teams ct
  WHERE ct.account_id = ${accountIdColumn} AND ct.team_type = 'contractual'
)`;

async function getDashboardOverview() {
  const [
    ticketCountsResult,
    statsResult,
    usersResult,
    staffResult,
    pendingVerifications,
    recentSignups,
    creditLeaders,
    roleBreakdown,
    statusBreakdown,
    forumCounts,
    memberSummary,
    memberPulse,
  ] = await Promise.all([
    pool
      .query(`
        SELECT
          (SELECT COUNT(*)::int FROM tickets WHERE deleted_at IS NULL AND status NOT IN ('Resolved', 'Closed')) AS open_tickets,
          (SELECT COUNT(*)::int FROM disputes WHERE status <> 'closed') AS open_disputes,
          (SELECT COUNT(*)::int FROM teams) AS total_teams,
          (SELECT COUNT(*)::int FROM marketplace_listings WHERE LOWER(status) = 'pending') AS pending_listings,
          (SELECT COALESCE(SUM(w.balance_credits + w.frozen_balance_credits), 0)::bigint
             FROM wallets w
             INNER JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
             WHERE w.type = 'account wallets') AS total_wallet_credits
      `)
      .catch(() => ({
        rows: [{ open_tickets: 0, open_disputes: 0, total_teams: 0, pending_listings: 0, total_wallet_credits: 0 }],
      })),
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM staff) AS total_staff,
        (SELECT COUNT(*)::int FROM accounts WHERE LOWER(COALESCE(status, '')) = 'active') AS active_users,
        (SELECT COUNT(*)::int FROM accounts WHERE type = 'User') AS platform_user_accounts,
        (SELECT COUNT(*)::int FROM accounts WHERE type = 'Staff') AS staff_accounts,
        (SELECT COUNT(*)::int FROM accounts a
         WHERE (LOWER(COALESCE(a.status, '')) != 'active' OR a.status IS NULL)
           AND ${NOT_CONTRACT_WORKSPACE('a.account_id')}) AS pending_review,
        (SELECT COUNT(*)::int
         FROM verifications v
         LEFT JOIN verification_sessions avs ON avs.verification_session_id = v.verification_session_id
         WHERE COALESCE(v.is_verified, FALSE) = FALSE
           AND LOWER(COALESCE(avs.verification_status, 'unverified')) IN ('unverified', 'pending', 'pending review')
           AND ${NOT_CONTRACT_WORKSPACE('v.account_id')}) AS pending_verifications
    `),
    pool.query(`
      SELECT
        u.user_id,
        u.first_name,
        u.last_name,
        u.email_address,
        a.handle,
        a.display_name,
        a.status,
        a.type,
        a.created_at,
        a.avatar_file_id,
        a.tagline
      FROM users u
      INNER JOIN accounts a ON a.account_id = u.account_id
      ORDER BY a.created_at DESC NULLS LAST, u.user_id DESC
    `),
    pool.query(`
      SELECT
        s.staff_id,
        s.account_id,
        s.first_name,
        s.last_name,
        s.role,
        s.email_address,
        a.handle,
        a.display_name,
        a.status,
        a.created_at
      FROM staff s
      INNER JOIN accounts a ON a.account_id = s.account_id
      ORDER BY
        CASE WHEN s.role = 'Admin' THEN 0 ELSE 1 END,
        s.role,
        s.last_name
    `),
    pool.query(`
      SELECT
        a.account_id,
        u.user_id,
        COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS full_name,
        u.email_address,
        a.handle,
        COALESCE(
          CASE
            WHEN COALESCE(v.is_verified, FALSE) THEN 'verified'
            WHEN avs.verification_status IS NOT NULL THEN avs.verification_status
            ELSE 'unverified'
          END,
          a.status
        ) AS status,
        a.created_at,
        a.type
      FROM accounts a
      LEFT JOIN users u ON u.account_id = a.account_id
      LEFT JOIN verifications v ON v.account_id = a.account_id
      LEFT JOIN verification_sessions avs ON avs.verification_session_id = v.verification_session_id
      WHERE a.deleted_at IS NULL
        AND ${NOT_CONTRACT_WORKSPACE('a.account_id')}
        AND (
          LOWER(COALESCE(a.status, '')) != 'active'
          OR (
            COALESCE(v.is_verified, FALSE) = FALSE
            AND LOWER(COALESCE(avs.verification_status, 'unverified')) IN ('unverified', 'pending', 'pending review')
          )
        )
      ORDER BY a.created_at DESC NULLS LAST
      LIMIT 50
    `),
    pool.query(`
      SELECT
        u.user_id,
        COALESCE(a.display_name, TRIM(u.first_name || ' ' || u.last_name)) AS full_name,
        u.email_address,
        a.handle,
        a.status,
        a.created_at
      FROM users u
      INNER JOIN accounts a ON a.account_id = u.account_id
      ORDER BY a.created_at DESC NULLS LAST
      LIMIT 15
    `),
    // Credits leaderboard: members with the most credits (spendable + held), not newest signups.
    pool.query(`
      SELECT
        u.user_id,
        COALESCE(a.display_name, TRIM(u.first_name || ' ' || u.last_name)) AS full_name,
        a.handle,
        a.status,
        a.created_at,
        w.wallet_id,
        (w.balance_credits + w.frozen_balance_credits)::bigint AS total_credits,
        w.frozen_balance_credits::bigint AS held_credits
      FROM users u
      INNER JOIN accounts a ON a.account_id = u.account_id AND a.deleted_at IS NULL
      INNER JOIN account_wallets aw ON aw.account_id = a.account_id
      INNER JOIN wallets w ON w.wallet_id = aw.wallet_id AND w.type = 'account wallets'
      ORDER BY total_credits DESC, u.user_id
      LIMIT 8
    `),
    pool.query(`
      SELECT role, COUNT(*)::int AS count
      FROM staff
      GROUP BY role
      ORDER BY count DESC
    `),
    pool.query(`
      -- Older rows store the same status in different cases ('Active' / 'active'); group them as one.
      SELECT INITCAP(LOWER(TRIM(status))) AS status, COUNT(*)::int AS count
      FROM accounts
      WHERE type = 'User'
      GROUP BY INITCAP(LOWER(TRIM(status)))
      ORDER BY count DESC
    `),
    getForumCounts(),
    // The Members card is a summary: a failed read hides its extra figures, not the dashboard.
    fetchMemberSummary().catch((err) => {
      console.warn('Dashboard member summary skipped:', err.message);
      return null;
    }),
    fetchMemberPulse().catch((err) => {
      console.warn('Dashboard member pulse skipped:', err.message);
      return null;
    }),
  ]);

  const stats = statsResult.rows[0];
  const ticketStats = ticketCountsResult?.rows?.[0] || {
    open_tickets: 0,
    open_disputes: 0,
    total_teams: 0,
    pending_listings: 0,
    total_wallet_credits: 0,
  };
  const users = usersResult.rows.map(mapPlatformUser);
  const staff = staffResult.rows.map(mapStaffMember);
  const verificationQueue = pendingVerifications.rows.map(mapVerificationItem);
  const signups = recentSignups.rows.map(mapSignupItem);

  const recentActivity = buildPlatformActivity(signups, staff, verificationQueue);
  const economyFeed = creditLeaders.rows.map(mapEconomyItem);
  const alerts = buildPlatformAlerts(stats, verificationQueue, staff, forumCounts, ticketStats);

  return {
    lastUpdated: new Date().toISOString(),
    kpis: {
      pendingVerifications: Number(stats.pending_verifications ?? stats.pending_review),
      openDisputes: Number(ticketStats.open_disputes),
      platformRevenueCredits: Number(ticketStats.total_wallet_credits || 0),
      activeUsers: Number(stats.active_users),
      totalUsers: Number(stats.total_users),
      openTickets: Number(ticketStats.open_tickets),
      pendingApproval: Number(ticketStats.pending_listings || stats.pending_review),
      totalStaff: Number(stats.total_staff),
      totalTeams: Number(ticketStats.total_teams || 0),
      forumGroups: forumCounts.available ? forumCounts.groups : null,
      forumDiscussions: forumCounts.available ? forumCounts.discussions : null,
    },
    alerts,
    staffRoster: staff,
    platformUsers: users,
    verificationQueue,
    recentSignups: signups,
    recentActivity,
    economyFeed,
    memberHealth: memberSummary ? { ...memberSummary, pulse: memberPulse } : null,
    breakdowns: {
      staffByRole: roleBreakdown.rows.map((r) => ({
        role: r.role,
        count: r.count,
        label: formatRoleLabel(r.role),
      })),
      usersByStatus: statusBreakdown.rows.map((r) => ({
        status: r.status || 'Unknown',
        count: r.count,
      })),
    },
  };
}

function formatRoleLabel(role) {
  const labels = {
    Admin: 'Administrator',
    'Support Moderator': 'Support',
    'Jobs N Gigs Moderator': 'Jobs & Gigs',
    'Forum Moderator': 'Forum',
    'Marketplace Moderator': 'Marketplace',
  };
  return labels[role] || role;
}

function mapPlatformUser(row) {
  const name =
    [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
    row.display_name ||
    'Unnamed user';
  return {
    id: row.user_id,
    name,
    email: row.email_address,
    username: row.handle,
    displayName: row.display_name,
    status: normalizeStatus(row.status),
    joinedAt: row.created_at,
    hasAvatar: Boolean(row.avatar_file_id),
    tagline: row.tagline || null,
  };
}

function mapStaffMember(row) {
  const name =
    [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
    row.display_name ||
    'Staff member';
  return {
    id: row.staff_id,
    accountId: row.account_id,
    name,
    email: row.email_address,
    username: row.handle,
    role: row.role,
    roleLabel: formatRoleLabel(row.role),
    status: normalizeStatus(row.status),
    joinedAt: row.created_at,
    isAdmin: row.role === 'Admin',
  };
}

function mapVerificationItem(row) {
  return {
    id: row.account_id,
    userId: row.user_id,
    name: row.full_name?.trim() || 'Unknown',
    email: row.email_address || '—',
    username: row.handle || '—',
    status: row.status || 'Pending',
    submittedAt: row.created_at,
    accountType: row.type,
  };
}

function mapSignupItem(row) {
  return {
    id: row.user_id,
    name: row.full_name?.trim() || 'New user',
    email: row.email_address,
    username: row.handle,
    status: normalizeStatus(row.status),
    joinedAt: row.created_at,
  };
}

function mapEconomyItem(row, index) {
  return {
    id: row.user_id,
    rank: index + 1,
    name: row.full_name?.trim() || row.handle,
    username: row.handle,
    label: 'Member',
    timeAgo: formatRelativeTime(row.created_at),
    status: normalizeStatus(row.status),
    walletId: row.wallet_id || null,
    credits: Number(row.total_credits || 0),
    heldCredits: Number(row.held_credits || 0),
  };
}

function normalizeStatus(status) {
  if (!status) return 'Pending';
  if (status.toLowerCase() === 'active') return 'Active';
  return status;
}

function buildPlatformActivity(signups, staff, verificationQueue) {
  const events = [];

  for (const s of signups.slice(0, 6)) {
    events.push({
      id: `signup-${s.id}`,
      title: `New member joined: ${s.name}`,
      detail: `@${s.username || '—'} · ${s.status}`,
      timestamp: s.joinedAt,
      category: 'signup',
    });
  }

  for (const v of verificationQueue.slice(0, 4)) {
    events.push({
      id: `verify-${v.id}`,
      title: `Verification needed: ${v.name}`,
      detail: `Status: ${v.status} · @${v.username}`,
      timestamp: v.submittedAt,
      category: 'verification',
    });
  }

  for (const m of staff.filter((s) => !s.isAdmin).slice(0, 3)) {
    events.push({
      id: `staff-${m.id}`,
      title: `${m.roleLabel} on roster: ${m.name}`,
      detail: `@${m.username} · ${m.status}`,
      timestamp: m.joinedAt,
      category: 'staff',
    });
  }

  return events
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 12);
}

function buildPlatformAlerts(stats, verificationQueue, staff, forumCounts, ticketStats = {}) {
  const alerts = [];

  const pendingVerify = Number(stats.pending_verifications ?? stats.pending_review);
  if (pendingVerify > 0) {
    alerts.push({
      id: 'pending-verify',
      message: `${pendingVerify} account(s) waiting for verification or approval.`,
      severity: 'warning',
    });
  }

  if (Number(ticketStats.open_tickets) > 0) {
    alerts.push({
      id: 'open-tickets',
      message: `${ticketStats.open_tickets} support ticket(s) still open.`,
      severity: 'info',
    });
  }

  if (Number(ticketStats.pending_listings) > 0) {
    alerts.push({
      id: 'pending-listings',
      message: `${ticketStats.pending_listings} marketplace listing(s) awaiting review.`,
      severity: 'info',
    });
  }

  const admins = staff.filter((s) => s.isAdmin);
  if (admins.length === 0) {
    alerts.push({
      id: 'no-admin',
      message: 'No administrator account found on the platform.',
      severity: 'error',
    });
  }

  const highWalletCredits = Number(ticketStats.total_wallet_credits || 0) > 500000;
  if (highWalletCredits) {
    alerts.push({
      id: 'credit-volume',
      message: 'High total wallet credits in circulation — review economy health.',
      severity: 'info',
    });
  }

  if (forumCounts.available && forumCounts.groups > 20) {
    alerts.push({
      id: 'forum-growth',
      message: `${forumCounts.groups} active forum groups on the platform.`,
      severity: 'info',
    });
  }

  if (alerts.length === 0) {
    alerts.unshift({
      id: 'healthy',
      message: 'No urgent platform issues detected right now.',
      severity: 'success',
    });
  }

  return alerts.slice(0, 5);
}

function formatRelativeTime(dateValue) {
  if (!dateValue) return 'Recently';
  const diffSec = Math.floor((Date.now() - new Date(dateValue).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} days ago`;
  return new Date(dateValue).toLocaleDateString();
}

function formatDateTime(dateValue) {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

module.exports = { getDashboardOverview };
