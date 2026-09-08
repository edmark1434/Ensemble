const { pool } = require('../lib/Database');
const { getMongoClient, connectMongoDB } = require('../lib/MongoDb');
const { DEFAULT_SETTINGS, getSectionValue } = require('./AdminSettingsRepositories');
const { fetchDisputesList, fetchReportsList } = require('./AdminTicketsRepositories');
const {
  listRecentAccountActivity,
  getAccountActivityById,
  markAccountActivityReversed,
  recordAccountActivity,
} = require('./AccountActivityRepositories');

const REVERSIBLE_EVENT_CODES = new Set([
  'ACCOUNT_STATUS_CHANGED',
  'ACCOUNT_WARNED',
  'VIOLATION_ISSUED',
  'RESTRICTION_ISSUED',
  'CREDITS_FROZEN',
]);

function categoryFromEventCode(eventCode) {
  const code = String(eventCode || '').toUpperCase();
  if (code.includes('REPORT')) return 'report';
  if (code.includes('DISPUTE')) return 'dispute';
  if (code.includes('LISTING') || code.includes('MARKET')) return 'marketplace';
  if (code.includes('CREDIT') || code.includes('WALLET')) return 'economy';
  if (code.includes('VIOLATION') || code.includes('WARN') || code.includes('PARDON') || code.includes('RESTRICTION')) {
    return 'conduct';
  }
  if (code.includes('STATUS')) return 'account';
  return 'moderation';
}

function targetTypeFromEventCode(eventCode) {
  const code = String(eventCode || '').toUpperCase();
  if (code.includes('LISTING')) return 'Marketplace listing';
  if (code.includes('REPORT')) return 'Report';
  if (code.includes('DISPUTE')) return 'Dispute';
  return 'Account';
}

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
        r.type,
        r.description,
        r.status,
        r.priority,
        r.target_type,
        r.target_id,
        r.created_at,
        r.updated_at,
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
      target: r.target_name || r.target_id || 'Account',
      targetHandle: r.target_handle || r.report_number,
      targetType: r.target_type || 'Account',
      reason: r.type || r.description || 'User report',
      description: r.description || null,
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
  const rows = await listRecentAccountActivity({ limit: 40 });
  return rows.map((row) => {
    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const reversed = meta.reversed === true || meta.reversed === 'true';
    const reversible = !reversed && REVERSIBLE_EVENT_CODES.has(String(row.eventCode || '').toUpperCase());
    return {
      id: row.id,
      action: row.action,
      category: categoryFromEventCode(row.eventCode),
      target: row.accountName || row.accountHandle || 'Account',
      targetHandle: row.accountHandle || '—',
      targetType: targetTypeFromEventCode(row.eventCode),
      executedBy: row.actorName || 'Staff',
      executedByRole: row.actorRole || 'Staff',
      executedByHandle: row.actorName ? '—' : '—',
      timestamp: row.createdAt,
      status: reversed ? 'Reversed' : 'Completed',
      notes:
        (meta.reason || meta.note || meta.type || row.eventCode || '') +
        (row.referencePrefix && row.referenceId
          ? ` · ${row.referencePrefix}-${String(row.referenceId).slice(0, 8)}`
          : ''),
      eventCode: row.eventCode,
      accountId: row.accountId,
      referenceTable: row.referenceTable,
      referenceId: row.referenceId,
      reversible,
      metadata: meta,
    };
  });
}

async function reverseModerationActivity(activityId, staffSession = null) {
  const activity = await getAccountActivityById(activityId);
  if (!activity) {
    const err = new Error('Activity not found');
    err.statusCode = 404;
    throw err;
  }

  let meta = activity.metadata;
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      meta = {};
    }
  }
  if (!meta || typeof meta !== 'object') meta = {};

  if (meta.reversed) {
    throw new Error('This action was already reversed');
  }

  const code = String(activity.eventCode || '').toUpperCase();
  if (!REVERSIBLE_EVENT_CODES.has(code)) {
    throw new Error('This activity cannot be reversed');
  }

  const staffId = staffSession?.staffId || staffSession?.staff_id || null;
  const accountId = activity.accountId;
  if (!accountId) {
    throw new Error('Activity has no target account to reverse');
  }

  if (code === 'ACCOUNT_STATUS_CHANGED') {
    const restoreTo = meta.previousStatus || 'Active';
    await pool.query(`UPDATE accounts SET status = $1 WHERE account_id = $2`, [restoreTo, accountId]);
  } else if (code === 'ACCOUNT_WARNED' || code === 'VIOLATION_ISSUED') {
    const violationId = activity.referenceId;
    if (violationId) {
      const updated = await pool.query(
        `
        UPDATE violations
        SET status = 'reversed', deleted_at = COALESCE(deleted_at, NOW())
        WHERE violation_id::text = $1 OR violation_number = $1
        RETURNING violation_id
        `,
        [String(violationId)]
      );
      if (!updated.rows.length) {
        await pool.query(
          `
          UPDATE violations
          SET status = 'reversed', deleted_at = COALESCE(deleted_at, NOW())
          WHERE violation_id = (
            SELECT violation_id FROM violations
            WHERE account_id = $1
              AND deleted_at IS NULL
              AND LOWER(COALESCE(status, '')) IN ('active', 'open', 'pending')
            ORDER BY created_at DESC
            LIMIT 1
          )
          `,
          [accountId]
        );
      }
    }
  } else if (code === 'RESTRICTION_ISSUED') {
    const restrictionId = activity.referenceId;
    const uuidLike =
      restrictionId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(restrictionId)
      );
    if (uuidLike) {
      await pool.query(`UPDATE restrictions SET ends_at = NOW() WHERE restriction_id = $1::uuid`, [
        restrictionId,
      ]);
    } else {
      await pool.query(
        `
        UPDATE restrictions
        SET ends_at = NOW()
        WHERE account_id = $1
          AND (ends_at IS NULL OR ends_at > NOW())
        `,
        [accountId]
      );
    }
  } else if (code === 'CREDITS_FROZEN') {
    const wallet = await pool.query(
      `
      SELECT w.wallet_id, w.balance_credits, w.frozen_balance_credits
      FROM wallets w
      INNER JOIN account_wallets aw ON aw.wallet_id = w.wallet_id
      WHERE aw.account_id = $1 AND w.type = 'account wallets'
      ORDER BY w.created_at DESC
      LIMIT 1
      `,
      [accountId]
    );
    const row = wallet.rows[0];
    if (!row) throw new Error('No account wallet found to unfreeze');
    const frozen = Number(row.frozen_balance_credits || 0);
    if (frozen <= 0) throw new Error('No frozen credits to restore');
    await pool.query(
      `
      UPDATE wallets
      SET balance_credits = balance_credits + $1,
          frozen_balance_credits = 0
      WHERE wallet_id = $2
      `,
      [frozen, row.wallet_id]
    );
  }

  await markAccountActivityReversed(activityId, {
    reversedByStaffId: staffId,
    note: 'Reversed from Admin Moderation',
  });

  await recordAccountActivity({
    accountId,
    action: `Reversed: ${activity.action}`,
    eventCode: 'ACCOUNT_ACTION_REVERSED',
    referenceTable: 'account_activity',
    referencePrefix: 'ACT',
    referenceId: activityId,
    actorStaffId: staffId,
    metadata: {
      originalEventCode: code,
      originalAction: activity.action,
    },
  });

  return fetchRecentModerationActivity();
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
          AND LOWER(COALESCE(status, 'active')) NOT IN ('cleared', 'pardoned', 'resolved', 'expired')
          AND (expires_at IS NULL OR expires_at > NOW())
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
      // Always return the persisted configuration values (same store as Settings → Moderation).
      // Do not mutate stored flags based on Mongo connectivity — that caused false saves.
      return {
        ...DEFAULT_SETTINGS.moderation,
        ...(moderationSettings || {}),
      };
    })(),
    forumMongoConnected: Boolean(forum.connected),
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
    if (body.description !== undefined) patch.description = body.description;
    if (body.type !== undefined) patch.type = body.type;

    const sets = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(patch)) {
      sets.push(`${key} = $${idx}`);
      values.push(value);
      idx += 1;
    }
    if (!sets.length) throw new Error('No fields to update');
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
    if (body.description !== undefined || body.reason !== undefined) {
      patch.description = body.description ?? body.reason;
    }
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
  reverseModerationActivity,
};
