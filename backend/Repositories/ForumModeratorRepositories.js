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

function forumDb() {
  const client = getMongoClient();
  return client ? client.db('ensemble') : null;
}

function mongoConnected() {
  return Boolean(getMongoClient());
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// Forum moderation covers community/forum tickets and reports about forum content.
const FORUM_TICKET_SCOPE = { categoriesIn: ['community', 'forum'] };
const FORUM_REPORT_TYPES = ['discussion', 'comment', 'post', 'forum', 'thread'];

async function getForumTickets({ status } = {}) {
  return fetchScopedTickets({ ...FORUM_TICKET_SCOPE, status });
}

async function getForumReports({ status } = {}) {
  return fetchScopedReports({ targetTypesIn: FORUM_REPORT_TYPES, status });
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
async function setForumDiscussionStatus(discussionId, status) {
  const db = forumDb();
  if (!db) throw new Error('MongoDB is not connected');
  const allowed = ['active', 'removed'];
  if (!allowed.includes(status)) throw new Error(`Invalid discussion status: ${status}`);

  await db.collection('forum_discussions').updateOne(
    { _id: new ObjectId(discussionId) },
    { $set: { deleted_at: status === 'removed' ? new Date() : null, updated_at: new Date() } }
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

  const [groupCount, activeGroupCount, discussionDocs] = await Promise.all([
    db.collection('forum_groups').countDocuments({}),
    db.collection('forum_groups').countDocuments({ status: 'active' }),
    db
      .collection('forum_discussions')
      .aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            removed: { $sum: { $cond: [{ $ifNull: ['$deleted_at', false] }, 1, 0] } },
            comments: { $sum: { $size: { $ifNull: ['$comments', []] } } },
          },
        },
      ])
      .toArray(),
  ]);

  const d = discussionDocs[0] || { total: 0, removed: 0, comments: 0 };
  return {
    available: true,
    totalGroups: groupCount,
    activeGroups: activeGroupCount,
    totalDiscussions: d.total,
    removedDiscussions: d.removed,
    totalComments: d.comments,
  };
}

function buildAlerts(tc, rc) {
  const alerts = [];
  if (Number(tc.unassigned) > 0) {
    alerts.push({ id: 'unassigned', message: `${tc.unassigned} forum ticket(s) have no assignee.`, severity: 'warning' });
  }
  if (Number(rc.open_count) > 0) {
    alerts.push({ id: 'flagged-content', message: `${rc.open_count} flagged forum item(s) awaiting review.`, severity: 'error' });
  }
  if (Number(tc.open_count) + Number(tc.in_progress) > 0) {
    alerts.push({ id: 'open-tickets', message: `${Number(tc.open_count) + Number(tc.in_progress)} forum ticket(s) open.`, severity: 'info' });
  }
  if (!alerts.length) {
    alerts.push({ id: 'clear', message: 'Forum queues are clear.', severity: 'success' });
  }
  return alerts;
}

async function getForumOverview() {
  const [ticketCounts, categoryRows, reportCounts, tickets, reports, contentStats] = await Promise.all([
    scopedTicketCounts(FORUM_TICKET_SCOPE),
    scopedTicketCategoryBreakdown(FORUM_TICKET_SCOPE),
    scopedReportCounts({ targetTypesIn: FORUM_REPORT_TYPES }),
    getForumTickets(),
    getForumReports(),
    getForumContentStats(),
  ]);

  const tc = ticketCounts;
  const rc = reportCounts;

  return {
    lastUpdated: new Date().toISOString(),
    summary: {
      openTickets: Number(tc.open_count) + Number(tc.in_progress),
      totalTickets: Number(tc.total),
      unassignedTickets: Number(tc.unassigned),
      flaggedContent: Number(rc.open_count),
      totalReports: Number(rc.total),
      resolvedTickets: Number(tc.resolved),
    },
    forumContent: contentStats,
    charts: {
      ticketStatusMix: ticketStatusChart(tc),
      ticketCategories: toCategoryChart(categoryRows),
    },
    recentTickets: tickets.slice(0, 8),
    flaggedReports: reports.slice(0, 8),
    alerts: buildAlerts(tc, rc),
    notice: mongoConnected()
      ? null
      : 'MongoDB is not connected — forum groups, discussions and comment moderation are unavailable. Set MONGODB_URI in backend/.env to enable them. Ticket and report queues below always work.',
    dataSources: { tables: ['support_tickets', 'reports', 'forum_groups (mongo)', 'forum_discussions (mongo)'], persisted: true },
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
