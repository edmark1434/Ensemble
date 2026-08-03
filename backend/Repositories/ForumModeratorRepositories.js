const { ObjectId } = require('mongodb');
const { pool } = require('../lib/database');
const { getMongoClient } = require('../lib/mongodb');
const {
  fetchScopedTickets,
  scopedTicketCounts,
  scopedTicketCategoryBreakdown,
  fetchScopedReports,
  scopedReportCounts,
  toCategoryChart,
  ticketStatusChart,
} = require('./ModeratorSharedRepositories');
const { QUEUE_SCOPES } = require('../lib/ticketEnums');
const { FORUM_REPORT_TYPES } = require('../lib/reportEnums');

function forumDb() {
  const client = getMongoClient();
  return client ? client.db('ensemble') : null;
}

function mongoConnected() {
  return Boolean(getMongoClient());
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FORUM_TICKET_SCOPE = QUEUE_SCOPES.forums;

// Resolve account UUIDs found in Mongo documents to display handles.
async function lookupHandles(ids) {
  const uuids = [...new Set(ids.filter((id) => typeof id === 'string' && UUID_RE.test(id)))];
  if (!uuids.length) return {};
  const result = await pool.query(
    `SELECT a.account_id, a.handle, COALESCE(a.display_name, u.first_name || ' ' || u.last_name) AS name
     FROM accounts a
     LEFT JOIN users u ON u.account_id = a.account_id
     WHERE a.account_id = ANY($1)`,
    [uuids]
  );
  const map = {};
  for (const row of result.rows) {
    map[row.account_id] = { handle: row.handle, name: row.name };
  }
  return map;
}

// Forum moderation covers Forums tickets and reports about forum content.

async function getForumTickets({ status } = {}) {
  return fetchScopedTickets({ ...FORUM_TICKET_SCOPE, status });
}

async function getForumReports({ status } = {}) {
  return fetchScopedReports({ targetTypesIn: [...FORUM_REPORT_TYPES], status });
}

// ─── Forum content moderation (MongoDB) ─────────────────────────────────

async function getModeratorForumGroups() {
  const db = forumDb();
  if (!db) return { available: false, groups: [] };

  const groups = await db
    .collection('forum_groups')
    .find({})
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();

  const discussionCounts = await db
    .collection('forum_discussions')
    .aggregate([{ $group: { _id: '$forum_group_id', count: { $sum: 1 } } }])
    .toArray();
  const countMap = {};
  for (const c of discussionCounts) countMap[String(c._id)] = c.count;

  return {
    available: true,
    groups: groups.map((g) => ({
      id: String(g._id),
      name: g.group_name || 'Untitled group',
      description: g.description || null,
      imageUrl: g.image_url || null,
      status: g.status || 'active',
      memberCount: Array.isArray(g.members) ? g.members.length : 0,
      members: (Array.isArray(g.members) ? g.members : []).map((member) => ({
        userId: member.userId,
        role: member.role || 'Member',
        isBanned: Boolean(member.is_banned),
      })),
      discussionCount: countMap[String(g._id)] || 0,
      tags: Array.isArray(g.tags) ? g.tags : [],
      createdAt: g.created_at || null,
      deletedAt: g.deleted_at || null,
    })),
  };
}

async function setForumGroupStatus(groupId, status) {
  const db = forumDb();
  if (!db) throw new Error('MongoDB is not connected');
  const allowed = ['active', 'inactive'];
  if (!allowed.includes(status)) throw new Error(`Invalid group status: ${status}`);

  await db.collection('forum_groups').updateOne(
    { _id: new ObjectId(groupId) },
    { $set: { status, deleted_at: status === 'inactive' ? new Date() : null } }
  );
  return getModeratorForumGroups();
}

async function getModeratorForumDiscussions({ groupId, search } = {}) {
  const db = forumDb();
  if (!db) return { available: false, discussions: [] };

  const filter = {};
  if (groupId) filter.forum_group_id = groupId;
  if (search) filter.title = { $regex: String(search), $options: 'i' };

  const discussions = await db
    .collection('forum_discussions')
    .find(filter)
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();

  const groupIds = [...new Set(discussions.map((d) => String(d.forum_group_id)).filter(Boolean))];
  const groupDocs = groupIds.length
    ? await db
        .collection('forum_groups')
        .find({ _id: { $in: groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } })
        .toArray()
    : [];
  const groupNames = {};
  for (const g of groupDocs) groupNames[String(g._id)] = g.group_name;

  const handles = await lookupHandles(discussions.map((d) => d.user_id));

  return {
    available: true,
    discussions: discussions.map((d) => ({
      id: String(d._id),
      title: d.title || 'Untitled discussion',
      description: d.description || null,
      groupId: d.forum_group_id ? String(d.forum_group_id) : null,
      groupName: groupNames[String(d.forum_group_id)] || null,
      author: {
        userId: d.user_id ?? null,
        handle: handles[d.user_id]?.handle || null,
        name: handles[d.user_id]?.name || null,
      },
      commentCount: Array.isArray(d.comments) ? d.comments.filter((c) => c && c.comment).length : 0,
      likeCount: Array.isArray(d.likes) ? d.likes.length : 0,
      status: d.deleted_at ? 'removed' : 'active',
      isLocked: Boolean(d.is_locked),
      isSticky: Boolean(d.is_sticky),
      createdAt: d.created_at || null,
      updatedAt: d.updated_at || null,
    })),
  };
}

async function getModeratorForumDiscussionDetail(discussionId) {
  const db = forumDb();
  if (!db) throw new Error('MongoDB is not connected');

  const d = await db.collection('forum_discussions').findOne({ _id: new ObjectId(discussionId) });
  if (!d) return null;

  const comments = Array.isArray(d.comments) ? d.comments.filter((c) => c && c.comment_id) : [];
  const handles = await lookupHandles([d.user_id, ...comments.map((c) => c.user_id)]);

  return {
    id: String(d._id),
    title: d.title || 'Untitled discussion',
    description: d.description || null,
    groupId: d.forum_group_id ? String(d.forum_group_id) : null,
    author: {
      userId: d.user_id ?? null,
      handle: handles[d.user_id]?.handle || null,
      name: handles[d.user_id]?.name || null,
    },
    status: d.deleted_at ? 'removed' : 'active',
    isLocked: Boolean(d.is_locked),
    isSticky: Boolean(d.is_sticky),
    createdAt: d.created_at || null,
    comments: comments.map((c) => ({
      commentId: c.comment_id,
      comment: c.comment,
      author: {
        userId: c.user_id ?? null,
        handle: handles[c.user_id]?.handle || null,
        name: handles[c.user_id]?.name || null,
      },
      likeCount: Array.isArray(c.likes) ? c.likes.length : 0,
      isDeleted: Boolean(c.deleted_at),
      createdAt: c.created_at || null,
    })),
  };
}

// Remove or restore a whole discussion (soft delete keeps it queryable for audit).
async function setForumDiscussionStatus(discussionId, changes = {}) {
  const db = forumDb();
  if (!db) throw new Error('MongoDB is not connected');
  const updates = { updated_at: new Date() };
  if (changes.status != null) {
    if (!['active', 'removed'].includes(changes.status)) throw new Error(`Invalid discussion status: ${changes.status}`);
    updates.deleted_at = changes.status === 'removed' ? new Date() : null;
  }
  if (changes.isLocked != null) updates.is_locked = Boolean(changes.isLocked);
  if (changes.isSticky != null) updates.is_sticky = Boolean(changes.isSticky);
  if (Object.keys(updates).length === 1) throw new Error('No moderation fields provided');

  await db.collection('forum_discussions').updateOne(
    { _id: new ObjectId(discussionId) },
    { $set: updates }
  );
  return getModeratorForumDiscussionDetail(discussionId);
}

// Soft-delete a comment inside a discussion (moderator action).
async function removeForumDiscussionComment(discussionId, commentId) {
  const db = forumDb();
  if (!db) throw new Error('MongoDB is not connected');

  await db.collection('forum_discussions').updateOne(
    { _id: new ObjectId(discussionId), 'comments.comment_id': commentId },
    {
      $set: {
        'comments.$.deleted_at': new Date(),
        'comments.$.comment': '[removed by moderator]',
        'comments.$.updated_at': new Date(),
      },
    }
  );
  return getModeratorForumDiscussionDetail(discussionId);
}

async function getForumContentStats() {
  const db = forumDb();
  if (!db) return { available: false };

  const [groupCount, activeGroupCount, inactiveGroupCount, discussionDocs, recentGroups, recentDiscussions] =
    await Promise.all([
      db.collection('forum_groups').countDocuments({}),
      db.collection('forum_groups').countDocuments({ status: 'active' }),
      db.collection('forum_groups').countDocuments({ status: { $ne: 'active' } }),
      db
        .collection('forum_discussions')
        .aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              removed: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $ifNull: ['$deleted_at', false] },
                        { $eq: ['$status', 'removed'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              locked: { $sum: { $cond: [{ $eq: ['$is_locked', true] }, 1, 0] } },
              sticky: { $sum: { $cond: [{ $eq: ['$is_sticky', true] }, 1, 0] } },
              comments: { $sum: { $size: { $ifNull: ['$comments', []] } } },
            },
          },
        ])
        .toArray(),
      db.collection('forum_groups').find({}).sort({ created_at: -1 }).limit(6).toArray(),
      db.collection('forum_discussions').find({}).sort({ updated_at: -1, created_at: -1 }).limit(8).toArray(),
    ]);

  const d = discussionDocs[0] || { total: 0, removed: 0, locked: 0, sticky: 0, comments: 0 };
  const groupIds = [
    ...new Set(recentDiscussions.map((x) => x.forum_group_id).filter(Boolean).map(String)),
  ];
  const groupNameMap = {};
  if (groupIds.length) {
    const linked = await db
      .collection('forum_groups')
      .find({ _id: { $in: groupIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } })
      .project({ group_name: 1 })
      .toArray();
    for (const g of linked) groupNameMap[String(g._id)] = g.group_name || 'Untitled group';
  }

  return {
    available: true,
    totalGroups: groupCount,
    activeGroups: activeGroupCount,
    inactiveGroups: inactiveGroupCount,
    totalDiscussions: d.total,
    removedDiscussions: d.removed,
    lockedDiscussions: d.locked,
    stickyDiscussions: d.sticky,
    totalComments: d.comments,
    recentGroups: recentGroups.map((g) => ({
      id: String(g._id),
      name: g.group_name || 'Untitled group',
      status: g.status || 'active',
      memberCount: Array.isArray(g.members) ? g.members.length : 0,
      createdAt: g.created_at || null,
    })),
    recentDiscussions: recentDiscussions.map((x) => ({
      id: String(x._id),
      title: x.title || 'Untitled discussion',
      groupId: x.forum_group_id ? String(x.forum_group_id) : null,
      groupName: x.forum_group_id ? groupNameMap[String(x.forum_group_id)] || null : null,
      commentCount: Array.isArray(x.comments) ? x.comments.length : 0,
      status: x.deleted_at || x.status === 'removed' ? 'removed' : x.status || 'active',
      isLocked: Boolean(x.is_locked),
      isSticky: Boolean(x.is_sticky),
      updatedAt: x.updated_at || x.created_at || null,
    })),
  };
}

async function getForumReportBreakdown(targetTypesIn) {
  const params = [targetTypesIn];
  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('open', 'pending'))::int AS open_status,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('in_review', 'in review', 'in_progress', 'in progress'))::int AS in_review,
      COUNT(*) FILTER (WHERE LOWER(status) IN ('resolved', 'closed'))::int AS resolved,
      COUNT(*) FILTER (WHERE LOWER(status) = 'dismissed')::int AS dismissed,
      COUNT(*) FILTER (
        WHERE LOWER(status) NOT IN ('resolved', 'closed', 'dismissed')
          AND assigned_staff_id IS NULL
      )::int AS unassigned,
      COUNT(*) FILTER (
        WHERE LOWER(priority) = 'high'
          AND LOWER(status) NOT IN ('resolved', 'closed', 'dismissed')
      )::int AS high_priority
    FROM reports
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(target_type, type)) = ANY($1)
    `,
    params
  );
  const typeResult = await pool.query(
    `
    SELECT LOWER(COALESCE(target_type, type)) AS target_type, COUNT(*)::int AS count
    FROM reports
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(target_type, type)) = ANY($1)
    GROUP BY 1
    ORDER BY count DESC
    `,
    params
  );
  const c = result.rows[0] || {};
  return {
    counts: {
      total: Number(c.total || 0),
      openStatus: Number(c.open_status || 0),
      inReview: Number(c.in_review || 0),
      resolved: Number(c.resolved || 0),
      dismissed: Number(c.dismissed || 0),
      unassigned: Number(c.unassigned || 0),
      highPriority: Number(c.high_priority || 0),
      openCount:
        Number(c.open_status || 0) + Number(c.in_review || 0),
    },
    byType: typeResult.rows.map((r) => ({
      label: String(r.target_type || 'other')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (ch) => ch.toUpperCase()),
      value: Number(r.count),
    })),
  };
}

function buildAlerts(tc, rc, reportBreakdown, contentStats) {
  const alerts = [];
  const openTickets = Number(tc.open_count) + Number(tc.in_progress);

  if (Number(tc.unassigned) > 0) {
    alerts.push({
      id: 'unassigned',
      message: `${tc.unassigned} forum ticket(s) have no assignee.`,
      severity: 'warning',
      action: { tab: 'ticket-management', ticketFilters: { assignee: 'unassigned' } },
    });
  }
  if (Number(tc.high_priority) > 0) {
    alerts.push({
      id: 'high-priority',
      message: `${tc.high_priority} high-priority forum ticket(s) need attention.`,
      severity: 'error',
      action: { tab: 'ticket-management', ticketFilters: { priority: 'High', flag: 'open_only' } },
    });
  }
  if (Number(tc.awaiting_reply) > 0) {
    alerts.push({
      id: 'awaiting-reply',
      message: `${tc.awaiting_reply} forum ticket(s) awaiting a staff reply.`,
      severity: 'warning',
      action: { tab: 'ticket-management', ticketFilters: { flag: 'awaiting' } },
    });
  }
  if (Number(tc.escalated) > 0) {
    alerts.push({
      id: 'escalated',
      message: `${tc.escalated} escalated forum ticket(s) need a handoff.`,
      severity: 'error',
      action: { tab: 'ticket-management', ticketFilters: { flag: 'escalated' } },
    });
  }
  if (Number(rc.open_count) > 0) {
    alerts.push({
      id: 'flagged-content',
      message: `${rc.open_count} flagged forum item(s) awaiting review.`,
      severity: 'error',
      action: { tab: 'reports' },
    });
  }
  if (reportBreakdown?.counts?.unassigned > 0) {
    alerts.push({
      id: 'unassigned-reports',
      message: `${reportBreakdown.counts.unassigned} forum report(s) are unassigned.`,
      severity: 'warning',
      action: { tab: 'reports' },
    });
  }
  if (contentStats?.available && Number(contentStats.removedDiscussions) > 0) {
    alerts.push({
      id: 'removed-discussions',
      message: `${contentStats.removedDiscussions} discussion(s) are currently removed.`,
      severity: 'info',
      action: { tab: 'forum-discussion' },
    });
  }
  if (openTickets > 0) {
    alerts.push({
      id: 'open-tickets',
      message: `${openTickets} forum ticket(s) open.`,
      severity: 'info',
      action: { tab: 'ticket-management' },
    });
  }
  if (!alerts.length) {
    alerts.push({ id: 'clear', message: 'Forum queues are clear.', severity: 'success' });
  }
  return alerts;
}

async function getForumOverview() {
  const forumTypes = [...FORUM_REPORT_TYPES];
  const [ticketCounts, categoryRows, reportCounts, tickets, reports, contentStats, reportBreakdown] =
    await Promise.all([
      scopedTicketCounts(FORUM_TICKET_SCOPE),
      scopedTicketCategoryBreakdown(FORUM_TICKET_SCOPE),
      scopedReportCounts({ targetTypesIn: forumTypes }),
      getForumTickets(),
      getForumReports(),
      getForumContentStats(),
      getForumReportBreakdown(forumTypes),
    ]);

  const tc = ticketCounts;
  const rc = reportCounts;
  const rb = reportBreakdown.counts;

  const reportStatusMix = [
    { label: 'Open', value: rb.openStatus, color: '#f87171' },
    { label: 'In review', value: rb.inReview, color: '#fbbf24' },
    { label: 'Resolved', value: rb.resolved, color: '#34d399' },
    { label: 'Dismissed', value: rb.dismissed, color: '#a1a1aa' },
  ].filter((x) => x.value > 0);

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      highPriorityTickets: Number(tc.high_priority),
      awaitingReplyTickets: Number(tc.awaiting_reply),
      escalatedTickets: Number(tc.escalated),
      inProgressTickets: Number(tc.in_progress),
      flaggedContent: Number(rc.open_count),
      totalReports: Number(rc.total),
      unassignedReports: rb.unassigned,
      highPriorityReports: rb.highPriority,
      resolvedTickets: Number(tc.resolved),
      resolvedReports: rb.resolved,
    },
    forumContent: contentStats,
    charts: {
      ticketStatusMix: ticketStatusChart(tc),
      ticketCategories: toCategoryChart(categoryRows),
      reportStatusMix,
      reportTypes: reportBreakdown.byType.map((row, i) => ({
        ...row,
        color: ['#a78bfa', '#818cf8', '#c084fc', '#f0abfc', '#67e8f9', '#94a3b8'][i % 6],
      })),
    },
    recentTickets: tickets.slice(0, 10),
    flaggedReports: reports.slice(0, 10),
    alerts: buildAlerts(tc, rc, reportBreakdown, contentStats),
    notice: mongoConnected()
      ? null
      : 'MongoDB is not connected — forum groups, discussions and comment moderation are unavailable. Set MONGODB_URI in backend/.env to enable them. Ticket and report queues below always work.',
    dataSources: {
      tables: ['tickets', 'reports', 'forum_groups (mongo)', 'forum_discussions (mongo)'],
      persisted: true,
    },
  };
}

module.exports = {
  getForumOverview,
  getForumTickets,
  getForumReports,
  getModeratorForumGroups,
  setForumGroupStatus,
  getModeratorForumDiscussions,
  getModeratorForumDiscussionDetail,
  setForumDiscussionStatus,
  removeForumDiscussionComment,
};
