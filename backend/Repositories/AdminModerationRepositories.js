const { pool } = require('../lib/database');
const { getMongoClient, connectMongoDB } = require('../lib/mongodb');
const { DEFAULT_SETTINGS } = require('./AdminSettingsRepositories');

function normalizeStatus(status) {
  if (!status) return 'Unknown';
  const s = String(status).toLowerCase();
  if (s === 'active') return 'Active';
  if (s.includes('suspend')) return 'Suspended';
  if (s.includes('ban')) return 'Banned';
  if (s.includes('pending')) return 'Pending';
  return status;
}

function formatStaffName(row) {
  return (
    [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
    row.display_name ||
    row.role
  );
}

function formatUserName(row) {
  return (
    [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
    row.display_name ||
    row.handle
  );
}

function normalizePriority(priority) {
  if (!priority) return 'medium';
  const p = String(priority).toLowerCase();
  if (p === 'high' || p === 'urgent') return 'high';
  if (p === 'low') return 'low';
  return 'medium';
}

async function scanForumContent() {
  let client = getMongoClient();
  if (!client) client = await connectMongoDB();
  if (!client) {
    return {
      connected: false,
      activeGroups: 0,
      inactiveGroups: 0,
      discussions: 0,
      groups: [],
      flaggedDiscussions: [],
    };
  }

  try {
    const db = client.db('ensemble');
    const groupsCol = db.collection('forum_groups');
    const discussionsCol = db.collection('forum_discussions');

    const [activeGroups, inactiveGroups, discussions, groups, flaggedDiscussions] = await Promise.all([
      groupsCol.countDocuments({ status: 'active' }),
      groupsCol.countDocuments({ status: { $ne: 'active' } }),
      discussionsCol.countDocuments(),
      groupsCol.find({}).sort({ created_at: -1 }).limit(20).toArray(),
      discussionsCol.find({}).sort({ created_at: -1 }).limit(10).toArray(),
    ]);

    return {
      connected: true,
      activeGroups,
      inactiveGroups,
      discussions,
      groups: groups.map((g) => ({
        id: String(g._id),
        name: g.group_name || 'Unnamed group',
        description: g.description || null,
        memberCount: Array.isArray(g.members) ? g.members.length : 0,
        status: g.status || 'unknown',
        tags: g.tags || [],
        createdAt: g.created_at || null,
        deletedAt: g.deleted_at || null,
      })),
      flaggedDiscussions: flaggedDiscussions.map((d) => ({
        id: String(d._id),
        groupId: d.forum_group_id ? String(d.forum_group_id) : null,
        title: d.title || d.discussion_title || 'Discussion',
        commentCount: Array.isArray(d.comments) ? d.comments.length : 0,
        userId: d.user_id || null,
        createdAt: d.created_at || null,
      })),
    };
  } catch {
    return {
      connected: false,
      activeGroups: 0,
      inactiveGroups: 0,
      discussions: 0,
      groups: [],
      flaggedDiscussions: [],
    };
  }
}

async function fetchPendingCasesFromDb() {
  const [reports, disputes, listings, restricted, identity] = await Promise.all([
    pool.query(`
      SELECT
        r.report_id,
        r.report_number,
        r.reason,
        r.description,
        r.status,
        r.priority,
        r.target_type,
        r.target_label,
        r.created_at,
        COALESCE(fa.display_name, fa.handle, 'Account') AS target_name,
        fa.handle AS target_handle,
        st.role AS assigned_role
      FROM reports r
      LEFT JOIN accounts fa ON fa.account_id = r.for_account_id
      LEFT JOIN staff st ON st.staff_id = r.assigned_staff_id
      WHERE r.deleted_at IS NULL
        AND LOWER(COALESCE(r.status, 'open')) NOT IN ('resolved', 'closed', 'dismissed')
      ORDER BY r.created_at DESC
      LIMIT 40
    `),
    pool.query(`
      SELECT
        d.dispute_id,
        d.dispute_number,
        d.title,
        d.reason,
        d.status,
        d.priority,
        d.opened_at,
        d.created_at,
        COALESCE(ia.display_name, ia.handle, 'Initiator') AS initiator_name,
        ia.handle AS initiator_handle,
        st.role AS assigned_role
      FROM disputes d
      LEFT JOIN accounts ia ON ia.account_id = COALESCE(d.initiator_account_id, d.by_account_id)
      LEFT JOIN staff st ON st.staff_id = COALESCE(d.assigned_staff_id, d.handled_by_staff_id)
      WHERE LOWER(COALESCE(d.status, 'open')) NOT IN ('resolved', 'closed')
      ORDER BY COALESCE(d.opened_at, d.created_at) DESC
      LIMIT 40
    `),
    pool.query(`
      SELECT
        l.listing_id,
        l.listing_number,
        l.title,
        l.status,
        l.created_at,
        COALESCE(a.display_name, a.handle, 'Submitter') AS submitter_name,
        a.handle AS submitter_handle
      FROM marketplace_listings l
      LEFT JOIN accounts a ON a.account_id = l.submitted_by_account_id
      WHERE LOWER(l.status) = 'pending'
      ORDER BY l.created_at DESC
      LIMIT 40
    `),
    pool.query(`
      SELECT account_id, handle, display_name, type, status, created_at
      FROM accounts
      WHERE LOWER(COALESCE(status, '')) IN ('suspended', 'banned')
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 40
    `),
    pool.query(`
      SELECT
        u.user_id,
        u.account_id,
        u.first_name,
        u.last_name,
        a.handle,
        a.display_name,
        a.created_at,
        av.status AS verification_status
      FROM users u
      INNER JOIN accounts a ON a.account_id = u.account_id
      LEFT JOIN LATERAL (
        SELECT status
        FROM account_verification av
        WHERE av.account_id = a.account_id AND av.deleted_at IS NULL
        ORDER BY av.created_at DESC
        LIMIT 1
      ) av ON TRUE
      WHERE a.deleted_at IS NULL
        AND LOWER(COALESCE(av.status, 'unverified')) IN ('unverified', 'pending', 'pending review')
      ORDER BY a.created_at DESC
      LIMIT 40
    `),
  ]);

  const cases = [];

  for (const r of reports.rows) {
    cases.push({
      id: r.report_id,
      type: 'Report',
      priority: normalizePriority(r.priority),
      target: r.target_label || r.target_name,
      targetHandle: r.target_handle || r.report_number,
      targetType: r.target_type || 'Account',
      reason: r.reason || r.description || 'User report',
      assignedRole: r.assigned_role || 'Support Moderator',
      openedAt: r.created_at,
      status: 'Open',
    });
  }

  for (const d of disputes.rows) {
    cases.push({
      id: d.dispute_id,
      type: 'Dispute',
      priority: normalizePriority(d.priority || 'high'),
      target: d.title || d.initiator_name,
      targetHandle: d.initiator_handle || d.dispute_number,
      targetType: 'Dispute',
      reason: d.reason || 'Open dispute',
      assignedRole: d.assigned_role || 'Support Moderator',
      openedAt: d.opened_at || d.created_at,
      status: 'Open',
    });
  }

  for (const l of listings.rows) {
    cases.push({
      id: l.listing_id,
      type: 'Listing review',
      priority: 'medium',
      target: l.title,
      targetHandle: l.submitter_handle || l.listing_number,
      targetType: 'Marketplace listing',
      reason: 'Marketplace listing awaiting approval',
      assignedRole: 'Marketplace Moderator',
      openedAt: l.created_at,
      status: 'Open',
    });
  }

  for (const a of restricted.rows) {
    cases.push({
      id: `restriction-${a.account_id}`,
      type: 'Account restriction',
      priority: String(a.status).toLowerCase().includes('ban') ? 'high' : 'medium',
      target: a.display_name || a.handle,
      targetHandle: a.handle,
      targetType: a.type || 'Account',
      reason: `Account status is ${a.status}`,
      assignedRole: 'Support Moderator',
      openedAt: a.created_at,
      status: 'Open',
    });
  }

  for (const u of identity.rows) {
    cases.push({
      id: `verify-${u.user_id}`,
      type: 'Identity review',
      priority: 'low',
      target: formatUserName(u),
      targetHandle: u.handle,
      targetType: 'User',
      reason: `Verification status: ${u.verification_status || 'unverified'}`,
      assignedRole: 'Support Moderator',
      openedAt: u.created_at,
      status: 'Open',
    });
  }

  return cases.sort((a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0));
}

async function fetchRecentModerationActivity() {
  const [violations, listings, reports, disputes] = await Promise.all([
    pool.query(`
      SELECT
        v.violation_id,
        v.violation_number,
        v.title,
        v.reason,
        v.status,
        v.created_at,
        a.handle AS target_handle,
        COALESCE(a.display_name, a.handle, 'Account') AS target_name,
        COALESCE(sa.display_name, s.first_name || ' ' || s.last_name, 'Staff') AS executed_by,
        s.role AS executed_by_role,
        sa.handle AS executed_by_handle
      FROM violations v
      LEFT JOIN accounts a ON a.account_id = v.account_id
      LEFT JOIN staff s ON s.staff_id = COALESCE(v.issued_by_staff_id, v.staff_id)
      LEFT JOIN accounts sa ON sa.account_id = s.account_id
      WHERE v.deleted_at IS NULL
      ORDER BY v.created_at DESC
      LIMIT 25
    `),
    pool.query(`
      SELECT
        l.listing_id,
        l.listing_number,
        l.title,
        l.status,
        l.reviewed_at,
        l.created_at,
        a.handle AS target_handle,
        COALESCE(ra.display_name, rs.first_name || ' ' || rs.last_name, 'Staff') AS executed_by,
        rs.role AS executed_by_role,
        ra.handle AS executed_by_handle
      FROM marketplace_listings l
      LEFT JOIN accounts a ON a.account_id = l.submitted_by_account_id
      LEFT JOIN staff rs ON rs.staff_id = l.reviewed_by_staff_id
      LEFT JOIN accounts ra ON ra.account_id = rs.account_id
      WHERE l.reviewed_at IS NOT NULL
      ORDER BY l.reviewed_at DESC
      LIMIT 25
    `),
    pool.query(`
      SELECT
        r.report_id,
        r.report_number,
        r.reason,
        r.status,
        r.updated_at,
        r.created_at,
        COALESCE(fa.display_name, fa.handle, r.target_label, 'Target') AS target_name,
        fa.handle AS target_handle,
        COALESCE(sa.display_name, st.first_name || ' ' || st.last_name, 'Staff') AS executed_by,
        st.role AS executed_by_role,
        sa.handle AS executed_by_handle
      FROM reports r
      LEFT JOIN accounts fa ON fa.account_id = r.for_account_id
      LEFT JOIN staff st ON st.staff_id = r.assigned_staff_id
      LEFT JOIN accounts sa ON sa.account_id = st.account_id
      WHERE r.deleted_at IS NULL
      ORDER BY COALESCE(r.updated_at, r.created_at) DESC
      LIMIT 25
    `),
    pool.query(`
      SELECT
        d.dispute_id,
        d.dispute_number,
        d.title,
        d.status,
        d.updated_at,
        d.opened_at,
        COALESCE(ia.display_name, ia.handle, 'Initiator') AS target_name,
        ia.handle AS target_handle,
        COALESCE(sa.display_name, st.first_name || ' ' || st.last_name, 'Staff') AS executed_by,
        st.role AS executed_by_role,
        sa.handle AS executed_by_handle
      FROM disputes d
      LEFT JOIN accounts ia ON ia.account_id = COALESCE(d.initiator_account_id, d.by_account_id)
      LEFT JOIN staff st ON st.staff_id = COALESCE(d.assigned_staff_id, d.handled_by_staff_id)
      LEFT JOIN accounts sa ON sa.account_id = st.account_id
      ORDER BY COALESCE(d.updated_at, d.opened_at, d.created_at) DESC
      LIMIT 25
    `),
  ]);

  const activities = [];

  for (const v of violations.rows) {
    activities.push({
      id: `vio-${v.violation_id}`,
      action: v.title ? `Issued violation: ${v.title}` : 'Issued violation',
      category: 'conduct',
      target: v.target_name,
      targetHandle: v.target_handle || v.violation_number,
      targetType: 'Account',
      executedBy: v.executed_by,
      executedByRole: v.executed_by_role || 'Staff',
      executedByHandle: v.executed_by_handle || '—',
      timestamp: v.created_at,
      status: v.status || 'Completed',
      notes: v.reason || v.violation_number || '',
    });
  }

  for (const l of listings.rows) {
    activities.push({
      id: `lst-${l.listing_id}`,
      action: `Listing ${l.status}`,
      category: 'marketplace',
      target: l.title,
      targetHandle: l.target_handle || l.listing_number,
      targetType: 'Marketplace listing',
      executedBy: l.executed_by,
      executedByRole: l.executed_by_role || 'Marketplace Moderator',
      executedByHandle: l.executed_by_handle || '—',
      timestamp: l.reviewed_at || l.created_at,
      status: 'Completed',
      notes: l.listing_number || '',
    });
  }

  for (const r of reports.rows) {
    activities.push({
      id: `rep-${r.report_id}`,
      action: `Report ${r.status || 'updated'}`,
      category: 'report',
      target: r.target_name,
      targetHandle: r.target_handle || r.report_number,
      targetType: 'Report',
      executedBy: r.executed_by,
      executedByRole: r.executed_by_role || 'Support Moderator',
      executedByHandle: r.executed_by_handle || '—',
      timestamp: r.updated_at || r.created_at,
      status: r.status || 'Open',
      notes: r.reason || '',
    });
  }

  for (const d of disputes.rows) {
    activities.push({
      id: `dis-${d.dispute_id}`,
      action: `Dispute ${d.status || 'updated'}`,
      category: 'dispute',
      target: d.title || d.target_name,
      targetHandle: d.target_handle || d.dispute_number,
      targetType: 'Dispute',
      executedBy: d.executed_by,
      executedByRole: d.executed_by_role || 'Support Moderator',
      executedByHandle: d.executed_by_handle || '—',
      timestamp: d.updated_at || d.opened_at,
      status: d.status || 'Open',
      notes: d.dispute_number || '',
    });
  }

  return activities
    .filter((a) => a.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 25);
}

function computeModeratorPerformance(staff, activities) {
  const moderators = staff.filter((s) => s.role !== 'Admin');
  const totalActions = activities.length || 1;

  return moderators.map((m) => {
    const name = formatStaffName(m);
    const actions = activities.filter(
      (a) => a.executedBy === name || a.executedByHandle === m.handle
    ).length;
    const score =
      activities.length === 0
        ? normalizeStatus(m.status) === 'Active'
          ? 50
          : 20
        : Math.min(100, Math.round((actions / totalActions) * 100) + 40);

    return {
      id: m.staff_id,
      name,
      role: m.role,
      handle: m.handle,
      email: m.email_address,
      status: normalizeStatus(m.status),
      actionsHandled: actions,
      performanceScore: score,
      active: normalizeStatus(m.status) === 'Active',
    };
  });
}

async function getModerationOverview() {
  const [
    usersResult,
    staffResult,
    accountStats,
    statusBreakdown,
    forum,
    disputeStats,
    reportStats,
    listingStats,
    violationStats,
    moderationSettingsRow,
  ] = await Promise.all([
    pool.query(`
      SELECT
        u.user_id,
        u.account_id,
        u.first_name,
        u.last_name,
        u.email_address,
        u.firebase_user_uuid,
        u.customer_id,
        a.handle,
        a.display_name,
        a.status,
        a.merit_score,
        a.created_at,
        a.deleted_at
      FROM users u
      INNER JOIN accounts a ON a.account_id = u.account_id
      ORDER BY a.created_at DESC
    `),
    pool.query(`
      SELECT
        s.staff_id,
        s.first_name,
        s.last_name,
        s.role,
        s.email_address,
        a.handle,
        a.display_name,
        a.status
      FROM staff s
      INNER JOIN accounts a ON a.account_id = s.account_id
      ORDER BY
        CASE WHEN s.role = 'Admin' THEN 0 ELSE 1 END,
        s.role
    `),
    pool.query(`
      SELECT
        COUNT(*)::int AS total_accounts,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'active')::int AS active_accounts,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) != 'active' OR status IS NULL)::int AS non_active_accounts,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::int AS soft_deleted,
        COUNT(*) FILTER (WHERE type = 'User')::int AS user_accounts,
        COUNT(*) FILTER (WHERE type = 'Staff')::int AS staff_accounts
      FROM accounts
    `),
    pool.query(`
      SELECT status, COUNT(*)::int AS count
      FROM accounts
      GROUP BY status
      ORDER BY count DESC
    `),
    scanForumContent(),
    pool
      .query(`
        SELECT COUNT(*)::int AS open_disputes
        FROM disputes
        WHERE LOWER(COALESCE(status, 'open')) NOT IN ('resolved', 'closed')
      `)
      .catch(() => ({ rows: [{ open_disputes: 0 }] })),
    pool
      .query(`
        SELECT COUNT(*)::int AS open_reports
        FROM reports
        WHERE deleted_at IS NULL
          AND LOWER(COALESCE(status, 'open')) NOT IN ('resolved', 'closed', 'dismissed')
      `)
      .catch(() => ({ rows: [{ open_reports: 0 }] })),
    pool
      .query(`
        SELECT COUNT(*)::int AS pending_listings
        FROM marketplace_listings
        WHERE LOWER(status) = 'pending'
      `)
      .catch(() => ({ rows: [{ pending_listings: 0 }] })),
    pool
      .query(`
        SELECT COUNT(*)::int AS active_violations
        FROM violations
        WHERE deleted_at IS NULL
          AND LOWER(COALESCE(status, 'active')) NOT IN ('cleared', 'pardoned', 'resolved')
      `)
      .catch(() => ({ rows: [{ active_violations: 0 }] })),
    pool
      .query(`SELECT setting_value FROM platform_settings WHERE setting_key = 'moderation'`)
      .catch(() => ({ rows: [] })),
  ]);

  const users = usersResult.rows;
  const staff = staffResult.rows;
  const stats = accountStats.rows[0];

  const [pendingCases, recentActivity] = await Promise.all([
    fetchPendingCasesFromDb(),
    fetchRecentModerationActivity(),
  ]);

  if (forum.connected) {
    for (const g of forum.groups.filter((x) => x.status !== 'active').slice(0, 5)) {
      pendingCases.push({
        id: `case-forum-${g.id}`,
        type: 'Forum group',
        priority: 'medium',
        target: g.name,
        targetHandle: g.id,
        targetType: 'Forum group',
        reason: `Group status: ${g.status}`,
        assignedRole: 'Forum Moderator',
        openedAt: g.createdAt,
        status: 'Open',
      });
    }
  }

  const moderatorPerformance = computeModeratorPerformance(staff, recentActivity);
  const activeModerators = staff.filter(
    (s) => s.role !== 'Admin' && normalizeStatus(s.status) === 'Active'
  ).length;

  const avgPerformance =
    moderatorPerformance.length > 0
      ? Math.round(
          moderatorPerformance.reduce((s, m) => s + m.performanceScore, 0) /
            moderatorPerformance.length
        )
      : 0;

  const identityReviewCount = pendingCases.filter((c) => c.type === 'Identity review').length;
  const openDisputes = Number(disputeStats.rows[0]?.open_disputes || 0);
  const openReports = Number(reportStats.rows[0]?.open_reports || 0);
  const pendingListings = Number(listingStats.rows[0]?.pending_listings || 0);

  return {
    lastUpdated: new Date().toISOString(),
    dataSources: {
      postgres: {
        tables: [
          'accounts',
          'users',
          'staff',
          'reports',
          'disputes',
          'violations',
          'marketplace_listings',
          'platform_settings',
          'account_verification',
        ],
        accountCount: stats.total_accounts,
        userCount: users.length,
        staffCount: staff.length,
      },
      mongo: {
        connected: forum.connected,
        collections: forum.connected ? ['forum_groups', 'forum_discussions'] : [],
        forumGroups: forum.activeGroups + forum.inactiveGroups,
        discussions: forum.discussions,
      },
      notYetInDatabase: [],
      persisted: ['reports', 'disputes', 'violations', 'marketplace_listings', 'platform_settings'],
    },
    summary: {
      yourPendingCases: pendingCases.filter((c) => c.status === 'Open').length,
      moderatorPerformancePercent: avgPerformance,
      activeModerators,
      totalModerators: staff.filter((s) => s.role !== 'Admin').length,
      openIdentityReviews: identityReviewCount,
      nonActiveAccounts: Number(stats.non_active_accounts),
      softDeletedAccounts: Number(stats.soft_deleted),
      forumGroupsActive: forum.activeGroups,
      forumDiscussions: forum.discussions,
      disputeQueueCount: openDisputes,
      openReports,
      pendingListings,
      activeViolations: Number(violationStats.rows[0]?.active_violations || 0),
    },
    pendingCases,
    recentActivity,
    moderatorRoster: moderatorPerformance,
    accountStatusBreakdown: statusBreakdown.rows.map((r) => ({
      status: r.status || 'Unknown',
      count: r.count,
    })),
    forumReviewQueue: forum.groups.slice(0, 12),
    contentSnapshots: forum.flaggedDiscussions.slice(0, 8),
    automatedSettings: {
      ...DEFAULT_SETTINGS.moderation,
      ...(moderationSettingsRow.rows[0]?.setting_value || {}),
      forumLinkScanning: forum.connected,
    },
    alerts: buildModerationAlerts(
      pendingCases,
      forum,
      stats,
      openDisputes,
      openReports,
      pendingListings
    ),
  };
}

function buildModerationAlerts(cases, forum, stats, openDisputes, openReports, pendingListings) {
  const alerts = [];

  const open = cases.filter((c) => c.status === 'Open').length;
  if (open > 0) {
    alerts.push({
      id: 'open-cases',
      message: `${open} moderation case(s) need review.`,
      severity: open > 5 ? 'warning' : 'info',
    });
  }

  if (openReports > 0) {
    alerts.push({
      id: 'open-reports',
      message: `${openReports} open report(s) in the triage queue.`,
      severity: 'info',
    });
  }

  if (pendingListings > 0) {
    alerts.push({
      id: 'pending-listings',
      message: `${pendingListings} marketplace listing(s) awaiting approval.`,
      severity: 'info',
    });
  }

  if (Number(stats.non_active_accounts) > 0) {
    alerts.push({
      id: 'non-active',
      message: `${stats.non_active_accounts} account(s) are not fully active.`,
      severity: 'warning',
    });
  }

  if (!forum.connected) {
    alerts.push({
      id: 'mongo-off',
      message: 'Forum content not connected — connect MongoDB to moderate discussions.',
      severity: 'info',
    });
  } else if (forum.inactiveGroups > 0) {
    alerts.push({
      id: 'inactive-forum',
      message: `${forum.inactiveGroups} inactive forum group(s) in the system.`,
      severity: 'info',
    });
  }

  if (openDisputes > 0) {
    alerts.push({
      id: 'open-disputes',
      message: `${openDisputes} open dispute(s) in the resolution queue.`,
      severity: openDisputes > 3 ? 'warning' : 'info',
    });
  }

  if (alerts.length === 0) {
    alerts.unshift({
      id: 'stable',
      message: 'No urgent moderation escalations from current database scan.',
      severity: 'success',
    });
  }

  return alerts.slice(0, 5);
}

module.exports = { getModerationOverview };
