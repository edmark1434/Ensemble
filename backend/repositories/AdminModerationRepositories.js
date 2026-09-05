const { pool } = require('../lib/Database');
const { getMongoClient, connectMongoDB } = require('../lib/MongoDb');
const { DEFAULT_SETTINGS, getSectionValue } = require('./AdminSettingsRepositories');
const { fetchDisputesList, fetchReportsList } = require('./AdminTicketsRepositories');

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
  if (!priority) return 'Medium';
  const p = String(priority).toLowerCase();
  if (p === 'high' || p === 'urgent') return 'High';
  if (p === 'low') return 'Low';
  return 'Medium';
}

function titleCaseStatus(status) {
  if (!status) return 'Open';
  const s = String(status).toLowerCase();
  if (s === 'open' || s === 'pending') return 'Open';
  if (s === 'resolved') return 'Resolved';
  if (s === 'closed') return 'Closed';
  if (s === 'dismissed') return 'Dismissed';
  if (s === 'in_progress' || s === 'in progress') return 'In progress';
  return String(status).charAt(0).toUpperCase() + String(status).slice(1).toLowerCase();
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
  const [reports, listings, identity] = await Promise.all([
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
        r.assigned_staff_id,
        r.for_account_id,
        COALESCE(fa.display_name, fa.handle, 'Account') AS target_name,
        fa.handle AS target_handle,
        st.role AS assigned_role,
        COALESCE(
          NULLIF(TRIM(COALESCE(sta.display_name, '')), ''),
          NULLIF(TRIM(CONCAT_WS(' ', st.first_name, st.last_name)), ''),
          sta.handle
        ) AS assigned_staff_name
      FROM reports r
      LEFT JOIN accounts fa ON fa.account_id = r.for_account_id
      LEFT JOIN staff st ON st.staff_id = r.assigned_staff_id
      LEFT JOIN accounts sta ON sta.account_id = st.account_id
      WHERE r.deleted_at IS NULL
        AND LOWER(COALESCE(r.status, 'open')) NOT IN ('resolved', 'closed', 'dismissed')
      ORDER BY r.created_at DESC
      LIMIT 40
    `),
    pool.query(`
      SELECT
        l.listing_id,
        l.listing_number,
        l.title,
        l.status,
        l.created_at,
        l.reviewed_by_staff_id,
        COALESCE(a.display_name, a.handle, 'Submitter') AS submitter_name,
        a.handle AS submitter_handle,
        st.role AS assigned_role,
        COALESCE(
          NULLIF(TRIM(COALESCE(sta.display_name, '')), ''),
          NULLIF(TRIM(CONCAT_WS(' ', st.first_name, st.last_name)), ''),
          sta.handle
        ) AS assigned_staff_name
      FROM marketplace_listings l
      LEFT JOIN accounts a ON a.account_id = l.submitted_by_account_id
      LEFT JOIN staff st ON st.staff_id = l.reviewed_by_staff_id
      LEFT JOIN accounts sta ON sta.account_id = st.account_id
      WHERE LOWER(l.status) = 'pending'
      ORDER BY l.created_at DESC
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
        av.status AS verification_status,
        av.verified_by_staff_id,
        st.role AS assigned_role,
        COALESCE(
          NULLIF(TRIM(COALESCE(sta.display_name, '')), ''),
          NULLIF(TRIM(CONCAT_WS(' ', st.first_name, st.last_name)), ''),
          sta.handle
        ) AS assigned_staff_name
      FROM users u
      INNER JOIN accounts a ON a.account_id = u.account_id
      LEFT JOIN LATERAL (
        SELECT status, verified_by_staff_id
        FROM account_verification av
        WHERE av.account_id = a.account_id AND av.deleted_at IS NULL
        ORDER BY av.created_at DESC
        LIMIT 1
      ) av ON TRUE
      LEFT JOIN staff st ON st.staff_id = av.verified_by_staff_id
      LEFT JOIN accounts sta ON sta.account_id = st.account_id
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
      source: 'report',
      type: 'Report',
      priority: normalizePriority(r.priority),
      target: r.target_label || r.target_name,
      targetHandle: r.target_handle || r.report_number,
      targetType: r.target_type || 'Account',
      reason: r.reason || r.description || 'User report',
      description: r.description || r.reason || null,
      referenceNumber: r.report_number || null,
      accountId: r.for_account_id || null,
      assignedRole: r.assigned_role || null,
      assignedStaffId: r.assigned_staff_id || null,
      assignedStaffName: r.assigned_staff_name || null,
      openedAt: r.created_at,
      status: titleCaseStatus(r.status || 'Open'),
      canAssignMyself: true,
      canEdit: true,
      canDelete: true,
    });
  }

  for (const l of listings.rows) {
    cases.push({
      id: l.listing_id,
      source: 'listing',
      type: 'Listing review',
      priority: 'Medium',
      target: l.title,
      targetHandle: l.submitter_handle || l.listing_number,
      targetType: 'Marketplace listing',
      reason: 'Marketplace listing awaiting approval',
      description: l.title,
      referenceNumber: l.listing_number || null,
      accountId: null,
      assignedRole: l.assigned_role || null,
      assignedStaffId: l.reviewed_by_staff_id || null,
      assignedStaffName: l.assigned_staff_name || null,
      openedAt: l.created_at,
      status: 'Open',
      canAssignMyself: true,
      canEdit: true,
      canDelete: true,
    });
  }

  for (const u of identity.rows) {
    const verificationStatus = titleCaseStatus(u.verification_status || 'unverified');
    cases.push({
      id: `verify-${u.user_id}`,
      source: 'identity',
      type: 'Identity verification',
      priority: 'Low',
      target: formatUserName(u),
      targetHandle: u.handle,
      targetType: 'User',
      reason: `Verification status: ${verificationStatus}`,
      description: `User verification is ${verificationStatus}.`,
      referenceNumber: null,
      accountId: u.account_id,
      verificationStatus,
      assignedRole: u.assigned_role || null,
      assignedStaffId: u.verified_by_staff_id || null,
      assignedStaffName: u.assigned_staff_name || null,
      openedAt: u.created_at,
      status: 'Open',
      canAssignMyself: true,
      canEdit: true,
      canDelete: false,
    });
  }

  return cases.sort((a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0));
}

async function countOpenIdentityReviews() {
  const result = await pool.query(`
    SELECT COUNT(*)::int AS count
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
  `);
  return Number(result.rows[0]?.count || 0);
}

async function fetchRecentModerationActivity() {
  const [violations, listings, reports, disputes] = await Promise.all([
    pool.query(`
      SELECT
        v.violation_id,
        v.violation_number,
        v.type,
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
        r.description,
        r.target_type,
        r.target_label,
        r.reference_prefix,
        r.status,
        r.updated_at,
        r.created_at,
        COALESCE(fa.display_name, fa.handle, r.target_label, 'Target') AS target_name,
        fa.handle AS target_handle,
        COALESCE(ba.display_name, ba.handle, 'Account') AS executed_by,
        INITCAP(COALESCE(ba.type, 'account')) AS executed_by_role,
        ba.handle AS executed_by_handle
      FROM reports r
      LEFT JOIN accounts fa ON fa.account_id = r.for_account_id
      LEFT JOIN accounts ba ON ba.account_id = r.by_account_id
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
      LEFT JOIN accounts ia ON ia.account_id = d.by_account_id
      LEFT JOIN staff st ON st.staff_id = d.handled_by_staff_id
      LEFT JOIN accounts sa ON sa.account_id = st.account_id
      ORDER BY COALESCE(d.updated_at, d.opened_at, d.created_at) DESC
      LIMIT 25
    `),
  ]);

  const activities = [];

  for (const v of violations.rows) {
    activities.push({
      id: `vio-${v.violation_id}`,
      action: v.type ? `Issued violation: ${v.type}` : 'Issued violation',
      category: 'conduct',
      target: v.target_name,
      targetHandle: v.target_handle || v.violation_number,
      targetType: 'Account',
      executedBy: v.executed_by,
      executedByRole: v.executed_by_role || 'Staff',
      executedByHandle: v.executed_by_handle || '—',
      timestamp: v.created_at,
      status: titleCaseStatus(v.status || 'completed'),
      notes: v.reason || v.violation_number || '',
    });
  }

  for (const l of listings.rows) {
    activities.push({
      id: `lst-${l.listing_id}`,
      action: `Listing ${String(l.status || 'reviewed').replace(/_/g, ' ').toLowerCase()}`,
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
      action: `Report ${String(r.status || 'updated').replace(/_/g, ' ').toLowerCase()}`,
      category: 'report',
      target: r.target_name,
      targetHandle: r.target_handle || r.report_number,
      targetType:
        String(r.target_type || '').toLowerCase() === 'chat_message'
          ? r.target_label || 'Chat Inbox'
          : String(r.target_type || 'Report')
              .replace(/[_-]+/g, ' ')
              .replace(/\b\w/g, (character) => character.toUpperCase()),
      executedBy: r.executed_by,
      executedByRole: r.executed_by_role || 'Account',
      executedByHandle: r.executed_by_handle || '—',
      timestamp: r.updated_at || r.created_at,
      status: titleCaseStatus(r.status || 'open'),
      notes: r.description || r.reason || '',
    });
  }

  for (const d of disputes.rows) {
    activities.push({
      id: `dis-${d.dispute_id}`,
      action: `Dispute ${String(d.status || 'updated').replace(/_/g, ' ').toLowerCase()}`,
      category: 'dispute',
      target: d.title || d.target_name,
      targetHandle: d.target_handle || d.dispute_number,
      targetType: 'Dispute',
      executedBy: d.executed_by,
      executedByRole: d.executed_by_role || 'Support Moderator',
      executedByHandle: d.executed_by_handle || '—',
      timestamp: d.updated_at || d.opened_at,
      status: titleCaseStatus(d.status || 'open'),
      notes: d.dispute_number || '',
    });
  }

  return activities
    .filter((a) => a.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 25);
}

function computeModeratorPerformance(staff, activities) {
  const totalActions = activities.length || 1;

  return staff.map((m) => {
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
      accountId: m.account_id,
      firstName: m.first_name,
      lastName: m.last_name,
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

async function getModerationOverview(staffSession = null) {
  const currentStaffId = await resolveSessionStaffId(staffSession);
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
    moderationSettings,
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
        s.account_id,
        s.first_name,
        s.last_name,
        s.role,
        s.email_address,
        a.handle,
        a.display_name,
        a.status
      FROM staff s
      INNER JOIN accounts a ON a.account_id = s.account_id
      WHERE a.deleted_at IS NULL
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
        WHERE LOWER(COALESCE(status, 'open')) <> 'closed'
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
    getSectionValue('moderation').catch(() => DEFAULT_SETTINGS.moderation),
  ]);

  const users = usersResult.rows;
  const staff = staffResult.rows;
  const stats = accountStats.rows[0];

  const [pendingCases, recentActivity, identityReviewCount, disputes, reports] = await Promise.all([
    fetchPendingCasesFromDb(),
    fetchRecentModerationActivity(),
    countOpenIdentityReviews(),
    fetchDisputesList().catch(() => []),
    fetchReportsList().catch(() => []),
  ]);

  const moderatorPerformance = computeModeratorPerformance(staff, recentActivity);
  const moderatorsOnly = moderatorPerformance.filter((m) => m.role !== 'Admin');
  const activeModerators = moderatorsOnly.filter((m) => m.active).length;

  const avgPerformance =
    moderatorsOnly.length > 0
      ? Math.round(
          moderatorsOnly.reduce((s, m) => s + m.performanceScore, 0) / moderatorsOnly.length
        )
      : 0;

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
          'configuration',
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
      persisted: ['reports', 'disputes', 'violations', 'marketplace_listings', 'configuration'],
    },
    summary: {
      yourPendingCases: currentStaffId
        ? pendingCases.filter(
            (c) =>
              c.assignedStaffId != null &&
              String(c.assignedStaffId).toLowerCase() === String(currentStaffId).toLowerCase()
          ).length +
          (disputes || []).filter(
            (d) =>
              d.assignee &&
              String(d.assignee.staffId).toLowerCase() === String(currentStaffId).toLowerCase() &&
              !['closed'].includes(
                String(d.status || '').toLowerCase()
              )
          ).length
        : 0,
      moderatorPerformancePercent: avgPerformance,
      activeModerators,
      totalModerators: moderatorsOnly.length,
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
    currentStaffId,
    pendingCases,
    disputes,
    reports,
    recentActivity,
    moderatorRoster: moderatorPerformance,
    accountStatusBreakdown: statusBreakdown.rows.map((r) => ({
      status: r.status || 'Unknown',
      count: r.count,
    })),
    forumReviewQueue: forum.groups.slice(0, 12),
    contentSnapshots: forum.flaggedDiscussions.slice(0, 8),
    automatedSettings: (() => {
      const saved = {
        ...DEFAULT_SETTINGS.moderation,
        ...(moderationSettings || {}),
      };
      // Link scanning can only run while the forum database is reachable.
      if (!forum.connected) saved.forumLinkScanning = false;
      return saved;
    })(),
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
      message: `${openReports} open report(s) — manage them in the Reports tab.`,
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
      message: `${openDisputes} open dispute(s) — manage them in the Disputes tab.`,
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

function staffIdFromSession(session) {
  return session?.staffId || session?.staff_id || null;
}

// Resolve a staff_id that is guaranteed to exist in the staff table.
// Sessions can carry a stale/missing staff_id (or omit account_id), which would
// violate assigned_staff_id FKs. Fall back through account → email → handle.
async function resolveSessionStaffId(session) {
  if (!session || typeof session !== 'object') return null;

  const candidate = staffIdFromSession(session);
  if (candidate != null && candidate !== '') {
    const existing = await pool.query(
      `SELECT staff_id FROM staff WHERE staff_id::text = $1 LIMIT 1`,
      [String(candidate)]
    );
    if (existing.rows.length) return existing.rows[0].staff_id;
  }

  const accountId = session.account_id ?? session.accountId ?? null;
  if (accountId != null && accountId !== '') {
    const byAccount = await pool.query(
      `SELECT staff_id FROM staff WHERE account_id::text = $1 LIMIT 1`,
      [String(accountId)]
    );
    if (byAccount.rows.length) return byAccount.rows[0].staff_id;
  }

  const email = session.email || session.email_address || null;
  if (email) {
    const byEmail = await pool.query(
      `SELECT staff_id FROM staff WHERE LOWER(email_address) = LOWER($1) LIMIT 1`,
      [String(email).trim()]
    );
    if (byEmail.rows.length) return byEmail.rows[0].staff_id;
  }

  const handle = session.username || session.handle || null;
  if (handle) {
    const byHandle = await pool.query(
      `SELECT s.staff_id
       FROM staff s
       INNER JOIN accounts a ON a.account_id = s.account_id
       WHERE LOWER(a.handle) = LOWER($1)
       LIMIT 1`,
      [String(handle).trim()]
    );
    if (byHandle.rows.length) return byHandle.rows[0].staff_id;
  }

  return null;
}

function normalizeWritablePriority(priority) {
  const p = String(priority || 'medium').toLowerCase();
  if (p === 'high' || p === 'urgent') return 'high';
  if (p === 'low') return 'low';
  return 'medium';
}

function normalizeWritableStatus(status) {
  const s = String(status || 'open').toLowerCase().replace(/\s+/g, '_');
  if (s === 'in_progress' || s === 'in-progress') return 'in_progress';
  if (['open', 'pending', 'resolved', 'closed', 'dismissed'].includes(s)) return s;
  return s;
}

function resolveCaseRef(caseId, sourceHint) {
  const id = String(caseId || '');
  const source = String(sourceHint || '').toLowerCase();
  if (source === 'identity' || id.startsWith('verify-')) {
    return { source: 'identity', id: id.replace(/^verify-/, '') };
  }
  if (['report', 'dispute', 'listing'].includes(source)) {
    return { source, id };
  }
  throw new Error('Case source is required (report, dispute, listing, or identity)');
}

async function updatePendingCase(caseId, body, session) {
  const { source, id } = resolveCaseRef(caseId, body?.source);
  const staffId = await resolveSessionStaffId(session);

  if (source === 'report') {
    const patch = {};
    if (body.status !== undefined) patch.status = normalizeWritableStatus(body.status);
    if (body.priority !== undefined) patch.priority = normalizeWritablePriority(body.priority);
    if (body.assignedStaffId !== undefined || body.assigned_staff_id !== undefined) {
      patch.assigned_staff_id = body.assignedStaffId ?? body.assigned_staff_id;
    }
    if (body.reason !== undefined) patch.reason = body.reason;
    if (body.description !== undefined) patch.description = body.description;

    const sets = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(patch)) {
      sets.push(`${key} = $${idx}`);
      values.push(value);
      idx += 1;
    }
    if (!sets.length) throw new Error('No fields to update');
    if (patch.status === 'resolved') sets.push('resolved_at = NOW()');
    sets.push('updated_at = NOW()');
    values.push(id);
    const result = await pool.query(
      `UPDATE reports SET ${sets.join(', ')} WHERE report_id = $${idx} AND deleted_at IS NULL RETURNING report_id`,
      values
    );
    if (!result.rows.length) throw new Error('Report not found');
    return { id, source, updated: true };
  }

  if (source === 'dispute') {
    const patch = {};
    if (body.status !== undefined) patch.status = normalizeWritableStatus(body.status);
    if (body.priority !== undefined) patch.priority = normalizeWritablePriority(body.priority);
    if (
      body.assignedStaffId !== undefined ||
      body.assigned_staff_id !== undefined ||
      body.handled_by_staff_id !== undefined
    ) {
      patch.handled_by_staff_id =
        body.handled_by_staff_id ?? body.assignedStaffId ?? body.assigned_staff_id;
    }
    if (body.reason !== undefined) patch.reason = body.reason;
    if (body.title !== undefined) patch.title = body.title;
    if (body.resolutionNotes !== undefined || body.resolution_notes !== undefined) {
      patch.resolution_notes = body.resolutionNotes ?? body.resolution_notes;
    }

    const sets = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(patch)) {
      sets.push(`${key} = $${idx}`);
      values.push(value);
      idx += 1;
    }
    if (!sets.length) throw new Error('No fields to update');
    if (patch.status && ['resolved', 'closed'].includes(patch.status)) {
      sets.push('resolved_at = NOW()');
    }
    sets.push('updated_at = NOW()');
    values.push(id);
    const result = await pool.query(
      `UPDATE disputes SET ${sets.join(', ')} WHERE dispute_id = $${idx} AND deleted_at IS NULL RETURNING dispute_id`,
      values
    );
    if (!result.rows.length) throw new Error('Dispute not found');
    return { id, source, updated: true };
  }

  if (source === 'listing') {
    const status = String(body.status || body.listingStatus || '').toLowerCase();
    const allowed = ['approved', 'rejected', 'delisted', 'pending'];
    if (!allowed.includes(status)) {
      throw new Error('Listing status must be approved, rejected, delisted, or pending');
    }
    const result = await pool.query(
      `UPDATE marketplace_listings
       SET status = $1,
           rejection_reason = $2,
           reviewed_by_staff_id = $3,
           reviewed_at = CASE WHEN $1 = 'pending' THEN NULL ELSE NOW() END,
           updated_at = NOW()
       WHERE listing_id = $4
       RETURNING listing_id`,
      [
        status,
        status === 'rejected' ? body.rejectionReason || body.reason || null : null,
        staffId,
        id,
      ]
    );
    if (!result.rows.length) throw new Error('Listing not found');
    return { id, source, updated: true, status };
  }

  throw new Error(`Unsupported case source: ${source}`);
}

async function deletePendingCase(caseId, body, session) {
  const { source, id } = resolveCaseRef(caseId, body?.source);
  const staffId = await resolveSessionStaffId(session);

  if (source === 'report') {
    const result = await pool.query(
      `UPDATE reports SET deleted_at = NOW(), updated_at = NOW()
       WHERE report_id = $1 AND deleted_at IS NULL
       RETURNING report_id`,
      [id]
    );
    if (!result.rows.length) throw new Error('Report not found');
    return { id, source, deleted: true };
  }

  if (source === 'dispute') {
    const result = await pool.query(
      `UPDATE disputes SET deleted_at = NOW(), updated_at = NOW(), status = 'closed'
       WHERE dispute_id = $1 AND deleted_at IS NULL
       RETURNING dispute_id`,
      [id]
    );
    if (!result.rows.length) throw new Error('Dispute not found');
    return { id, source, deleted: true };
  }

  if (source === 'listing') {
    const result = await pool.query(
      `UPDATE marketplace_listings
       SET status = 'rejected',
           rejection_reason = COALESCE($1, 'Removed from pending queue by admin'),
           reviewed_by_staff_id = $2,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE listing_id = $3 AND LOWER(status) = 'pending'
       RETURNING listing_id`,
      [body?.reason || null, staffId, id]
    );
    if (!result.rows.length) throw new Error('Pending listing not found');
    return { id, source, deleted: true };
  }

  throw new Error(`Cannot delete ${source} cases from this queue — resolve or update them instead`);
}

async function assignMyselfToPendingCase(caseId, body, session) {
  const { source, id } = resolveCaseRef(caseId, body?.source);
  const staffId = await resolveSessionStaffId(session);
  if (!staffId) {
    throw new Error(
      'Could not match your admin login to a staff profile. Sign out and sign back in to the Admin portal, then try again.'
    );
  }

  if (source === 'report') {
    const result = await pool.query(
      `UPDATE reports
       SET assigned_staff_id = $1,
           status = CASE
             WHEN LOWER(COALESCE(status, 'open')) IN ('open', 'pending') THEN 'in_progress'
             ELSE status
           END,
           updated_at = NOW()
       WHERE report_id = $2 AND deleted_at IS NULL
       RETURNING report_id, assigned_staff_id, status`,
      [staffId, id]
    );
    if (!result.rows.length) throw new Error('Report not found');
    return { id, source, assignedStaffId: staffId, status: titleCaseStatus(result.rows[0].status) };
  }

  if (source === 'dispute') {
    const result = await pool.query(
      `UPDATE disputes
       SET handled_by_staff_id = $1,
           status = CASE
             WHEN LOWER(COALESCE(status, 'open')) IN ('open', 'pending') THEN 'under_review'
             ELSE status
           END,
           updated_at = NOW()
       WHERE dispute_id = $2
       RETURNING dispute_id, handled_by_staff_id, status`,
      [staffId, id]
    );
    if (!result.rows.length) throw new Error('Dispute not found');
    return { id, source, assignedStaffId: staffId, status: titleCaseStatus(result.rows[0].status) };
  }

  if (source === 'listing') {
    const result = await pool.query(
      `UPDATE marketplace_listings
       SET reviewed_by_staff_id = $1,
           updated_at = NOW()
       WHERE listing_id = $2 AND LOWER(status) = 'pending'
       RETURNING listing_id, reviewed_by_staff_id`,
      [staffId, id]
    );
    if (!result.rows.length) throw new Error('Pending listing not found');
    return { id, source, assignedStaffId: staffId, status: 'Open' };
  }

  if (source === 'identity') {
    const userRes = await pool.query(
      `SELECT u.user_id, u.account_id
       FROM users u
       WHERE u.user_id::text = $1 OR u.account_id::text = $1
       LIMIT 1`,
      [id]
    );
    if (!userRes.rows.length) throw new Error('User not found for identity case');
    const accountId = userRes.rows[0].account_id;

    const existing = await pool.query(
      `SELECT account_verification_id, status
       FROM account_verification
       WHERE account_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [accountId]
    );

    if (existing.rows.length) {
      await pool.query(
        `UPDATE account_verification
         SET verified_by_staff_id = $1,
             updated_at = NOW()
         WHERE account_verification_id = $2`,
        [staffId, existing.rows[0].account_verification_id]
      );
    } else {
      await pool.query(
        `INSERT INTO account_verification (account_id, status, verified_by_staff_id)
         VALUES ($1, 'pending', $2)`,
        [accountId, staffId]
      );
    }
    return { id, source, assignedStaffId: staffId, accountId, status: 'Open' };
  }

  throw new Error(`Assign myself is not available for ${source} cases`);
}

module.exports = {
  getModerationOverview,
  updatePendingCase,
  deletePendingCase,
  assignMyselfToPendingCase,
};
